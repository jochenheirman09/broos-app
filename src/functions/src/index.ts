
'use server';
import * as functions from 'firebase-functions/v1';
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Alert } from '../../src/lib/types';


if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const LOCK_TIMEOUT_SECONDS = 5 * 60; // 5 minutes

/**
 * Attempts to acquire a distributed lock.
 * @param lockName The name of the lock to acquire.
 * @returns A promise that resolves to true if the lock was acquired, false otherwise.
 */
async function acquireLock(lockName: string): Promise<boolean> {
    const lockRef = db.collection('_locks').doc(lockName);
    try {
        await db.runTransaction(async (transaction) => {
            const lockDoc = await transaction.get(lockRef);
            if (lockDoc.exists) {
                const lockData = lockDoc.data();
                const lockTime = lockData?.timestamp.toDate();
                const now = new Date();
                // Check if the lock has expired
                if (now.getTime() - lockTime.getTime() > LOCK_TIMEOUT_SECONDS * 1000) {
                    console.log(`[LOCK] Stale lock '${lockName}' found. Overriding.`);
                    transaction.set(lockRef, { timestamp: FieldValue.serverTimestamp() });
                } else {
                    // Lock is still active
                    throw new Error(`Lock '${lockName}' is currently held.`);
                }
            } else {
                // Lock does not exist, acquire it
                transaction.set(lockRef, { timestamp: FieldValue.serverTimestamp() });
            }
        });
        console.log(`[LOCK] Lock '${lockName}' acquired successfully.`);
        return true;
    } catch (error: any) {
        console.log(`[LOCK] Failed to acquire lock '${lockName}': ${error.message}`);
        return false;
    }
}


// NOTE: The nightly analysis job is now triggered via an HTTP request to the
// Next.js server action endpoint `/api/cron`, not via this Cloud Function.
// This function can be removed or repurposed.


/**
 * 2. MORNING SUMMARY (08:30)
 */
export const morningSummary = onSchedule({
    schedule: "30 8 * * *",
    timeZone: "Europe/Brussels",
}, async (event) => {
    const lockAcquired = await acquireLock('morningSummary');
    if (!lockAcquired) {
        console.log("[morningSummary] Could not acquire lock, another instance is running. Exiting.");
        return;
    }

    try {
        const users = await db.collection('users').get();
        for (const userDoc of users.docs) {
            const userData = userDoc.data();
            const tokens = await getTokensForUser(userDoc.id);
            if (tokens.length === 0) continue;

            const role = userData.role;
            const notificationPayload = {
                notification: {
                    title: role === 'player' ? "Nieuw Weetje!" : "Nieuwe Team Inzichten",
                    body: "Er staan nieuwe updates voor je klaar in de Broos app."
                },
                data: {
                    link: '/dashboard'
                },
                webpush: {
                    fcmOptions: {
                        link: '/dashboard'
                    }
                }
            };
            
            await admin.messaging().sendEachForMulticast({ tokens, ...notificationPayload });
        }
        console.log("✅ Morning summaries verstuurd.");
    } catch (error) {
        console.error("❌ Fout bij morningSummary:", error);
    }
});


/**
 * 3. DAILY CHECK-IN REMINDER (17:00)
 */
export const dailyCheckInReminder = onSchedule({
    schedule: "0 17 * * *",
    timeZone: "Europe/Brussels",
}, async (event) => {
    const lockAcquired = await acquireLock('dailyCheckInReminder');
    if (!lockAcquired) {
        console.log("[dailyCheckInReminder] Could not acquire lock, another instance is running. Exiting.");
        return;
    }

    try {
        const players = await db.collection('users').where('role', '==', 'player').get();
        for (const playerDoc of players.docs) {
            const tokens = await getTokensForUser(playerDoc.id);
            if (tokens.length > 0) {
                await admin.messaging().sendEachForMulticast({
                    tokens,
                    notification: {
                        title: "Check-in met Broos!",
                        body: `Hey ${playerDoc.data().name || 'buddy'}, je buddy wacht op je!`
                    },
                    data: {
                        link: '/chat'
                    },
                    webpush: {
                        fcmOptions: {
                            link: '/chat'
                        }
                    }
                });
            }
        }
    } catch (error) {
        console.error("❌ Fout bij dailyCheckInReminder:", error);
    }
});


/**
 * 4. ON ALERT CREATED (v1) - Real-time and Idempotent
 * This function now uses a transaction to ensure a notification is sent only once.
 */
export const onAlertCreated = functions.firestore
    .document('clubs/{clubId}/teams/{teamId}/alerts/{alertId}')
    .onCreate(async (snapshot, context) => {
        const alertRef = snapshot.ref;
        console.log(`[onAlertCreated] Triggered for alert: ${alertRef.id}`);

        try {
            const shouldSend = await db.runTransaction(async (transaction) => {
                const doc = await transaction.get(alertRef);
                const data = doc.data();
                if (data && data.notificationStatus !== 'sent') {
                    transaction.update(alertRef, { notificationStatus: 'sent' });
                    return true; 
                }
                return false;
            });

            if (shouldSend) {
                console.log(`[onAlertCreated] ✅ WINNER for alert ${alertRef.id}, preparing to send notification.`);
                const alertData = snapshot.data() as Alert;
                const { clubId, teamId } = context.params;

                const staffQuery = db.collection('users').where('clubId', '==', clubId).where('role', '==', 'staff').where('teamId', '==', teamId);
                const responsibleQuery = db.collection('users').where('clubId', '==', clubId).where('role', '==', 'responsible');
                const [staffSnap, responsibleSnap] = await Promise.all([staffQuery.get(), responsibleQuery.get()]);
                
                const tokenSet = new Set<string>();
                const userIdsToNotify = new Set<string>();

                const processSnapshot = async (snap: FirebaseFirestore.QuerySnapshot) => {
                     for (const userDoc of snap.docs) {
                        userIdsToNotify.add(userDoc.id);
                        const tokens = await getTokensForUser(userDoc.id);
                        tokens.forEach(t => {
                            if (t && t.trim() !== "") {
                                tokenSet.add(t);
                            }
                        });
                    }
                }
                
                await processSnapshot(staffSnap);
                await processSnapshot(responsibleSnap);
               
                const tokensToSend = Array.from(tokenSet);
                console.log(`[onAlertCreated] Found ${tokensToSend.length} tokens for users:`, Array.from(userIdsToNotify));

                if (tokensToSend.length > 0) {
                     const notificationPayload = {
                        notification: {
                            title: `Broos Alert: ${alertData.alertType || "Aandacht!"}`,
                            body: alertData.triggeringMessage || "Nieuwe analyse beschikbaar."
                        },
                        data: {
                            link: "/alerts",
                            type: "ALERT",
                            alertId: context.params.alertId
                        },
                         webpush: {
                            notification: { badge: "1" },
                            fcmOptions: { link: "/alerts" }
                        }
                    };
                    
                    const response = await admin.messaging().sendEachForMulticast({ tokens: tokensToSend, ...notificationPayload });
                    console.log(`[onAlertCreated] ✅ FCM response: ${response.successCount} success, ${response.failureCount} failure.`);
                } else {
                    console.log(`[onAlertCreated] No tokens found for relevant staff/responsible users.`);
                }
            } else {
                 console.log(`[onAlertCreated] ❌ Notification for alert ${alertRef.id} already handled. Skipping.`);
            }

        } catch (error) {
            console.error(`[onAlertCreated] ❌ Transaction or send failed for alert ${alertRef.id}:`, error);
        }
    });

/**
 * HELPER: Fetches all valid FCM tokens for a user from their subcollection.
 */
async function getTokensForUser(userId: string): Promise<string[]> {
    const snap = await admin.firestore().collection('users').doc(userId).collection('fcmTokens').get();
    if (snap.empty) {
        return [];
    }
    return snap.docs.map(doc => doc.id);
}


/**
 * Triggered na registratie om clubId, teamId en rol in te stellen.
 */
export const setInitialUserClaims = functions.auth.user().onCreate(async (user: functions.auth.UserRecord) => {    
    const uid = user.uid;

    if (!user.email) {
        console.warn(`User ${uid} was created without an email address. Skipping claims setup.`);
        return null;
    }

    try {
        const registrationRef = admin.firestore().doc(`user_registrations/${uid}`);
        const registrationSnap = await registrationRef.get();
        
        if (!registrationSnap.exists) {
            console.log(`Registration document not found for ${uid}.`);
            return null;
        }

        const invitationCode = registrationSnap.data()?.invitationCode;
        if (!invitationCode) {
            await registrationRef.delete();
            return null;
        }

        const teamsQuery = admin.firestore().collectionGroup('teams').where('invitationCode', '==', invitationCode).limit(1);
        const teamSnapshot = await teamsQuery.get();

        if (teamSnapshot.empty) {
            await registrationRef.delete();
            return null;
        }

        const teamDoc = teamSnapshot.docs[0];
        const teamId = teamDoc.id;
        const clubId = teamDoc.data().clubId;

        const userProfileDoc = await admin.firestore().collection('users').doc(uid).get();
        const userRole = userProfileDoc.data()?.role || 'player';

        const customClaims = { role: userRole, clubId, teamId };
        await admin.auth().setCustomUserClaims(uid, customClaims);
        
        await admin.firestore().collection('users').doc(uid).update({ clubId, teamId });
        await registrationRef.delete(); 

        console.log(`✅ Claims set for ${uid}: ${JSON.stringify(customClaims)}`);
        return null;

    } catch (error) {
        console.error(`❌ Error in setInitialUserClaims:`, error);
        return null;
    }
});

    

    
