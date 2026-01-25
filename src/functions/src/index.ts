
'use server';
import * as functions from 'firebase-functions/v1';
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Alert } from '../../lib/types';


if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();
const LOCK_TIMEOUT_SECONDS = 5 * 60; // 5 minutes

async function acquireLock(lockName: string): Promise<boolean> {
    const lockRef = db.collection('_locks').doc(lockName);
    try {
        await db.runTransaction(async (transaction) => {
            const lockDoc = await transaction.get(lockRef);
            if (lockDoc.exists) {
                const lockData = lockDoc.data();
                const lockTime = lockData?.timestamp.toDate();
                const now = new Date();
                if (now.getTime() - lockTime.getTime() > LOCK_TIMEOUT_SECONDS * 1000) {
                    console.log(`[LOCK] Stale lock '${lockName}' found. Overriding.`);
                    transaction.set(lockRef, { timestamp: FieldValue.serverTimestamp() });
                } else {
                    throw new Error(`Lock '${lockName}' is currently held.`);
                }
            } else {
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
            const notificationTitle = role === 'player' ? "Nieuw Weetje!" : "Nieuwe Team Inzichten";
            const notificationBody = "Er staan nieuwe updates voor je klaar in de Broos app.";

            const notificationPayload = {
                notification: {
                    title: notificationTitle,
                    body: notificationBody,
                },
                data: {
                    link: '/dashboard',
                },
                android: { 
                    priority: 'high',
                    notification: {
                        channel_id: "default_channel",
                        icon: "stock_ticker_update",
                        color: "#3F51B5"
                    }
                },
                apns: {
                    payload: { aps: { 'content-available': 1, sound: 'default', badge: 1 } },
                    headers: { 'apns-priority': '10' },
                },
                webpush: {
                    headers: { Urgency: "high" },
                    notification: {
                        title: notificationTitle,
                        body: notificationBody,
                        icon: '/icons/icon-192x192.png',
                        badge: '/icons/icon-192x192.png',
                        tag: `morning_summary_${userDoc.id}`,
                        renotify: true,
                    },
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
 * Sends a daily check-in reminder to players.
 * If a team schedule is set, it only sends on 'training' or 'game' days.
 * If no schedule is set, it sends a generic reminder as a fallback.
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
        const dayMapping: { [key: number]: string } = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
        const now = new Date();
        const todayName = dayMapping[now.getDay()];
        console.log(`[dailyCheckInReminder] Running for day: ${todayName} (UTC Day Index: ${now.getDay()})`);

        const playersSnapshot = await db.collection('users').where('role', '==', 'player').get();
        const teamSchedules = new Map<string, any>();
        let notificationsSent = 0;

        for (const playerDoc of playersSnapshot.docs) {
            const player = playerDoc.data();
            if (!player.teamId || !player.clubId) {
                continue; // Skip players without a team/club
            }

            // Fetch and cache team schedule if not already fetched
            let schedule = teamSchedules.get(player.teamId);
            if (schedule === undefined) {
                const teamDocRef = db.doc(`clubs/${player.clubId}/teams/${player.teamId}`);
                const teamDoc = await teamDocRef.get();
                if (teamDoc.exists()) {
                    schedule = teamDoc.data()?.schedule || null; // explicit null for missing
                    teamSchedules.set(player.teamId, schedule);
                } else {
                    teamSchedules.set(player.teamId, null); // Cache miss
                    continue;
                }
            }
            
            const tokens = await getTokensForUser(playerDoc.id);
            if (tokens.length === 0) {
                continue;
            }

            let notificationPayload: { notification: { title: string; body: string; }; data: any, webpush: any, android: any, apns: any } | null = null;
            let title: string | null = null;
            let body: string | null = null;

            if (!schedule) {
                // FALLBACK: If no schedule is set for the team, send a generic daily reminder.
                title = "Tijd voor je check-in!";
                body = `Hey ${player.name || 'buddy'}, je buddy wacht op je!`;
                console.log(`[dailyCheckInReminder] Fallback: No schedule for team ${player.teamId}. Sending generic reminder to ${player.name}.`);
            } else {
                // SCHEDULED LOGIC: Send notification based on today's activity.
                const activity = schedule[todayName];
                if (activity === 'training' || activity === 'game') {
                    title = activity === 'game' ? "Het is wedstrijddag!" : "Het is trainingsdag!";
                    body = `Tijd voor je check-in, ${player.name || 'buddy'}!`;
                }
            }
            
            if (title && body) {
                notificationPayload = {
                    notification: { title, body },
                    data: {
                        link: '/chat',
                    },
                    android: { 
                        priority: 'high',
                        notification: {
                            channel_id: "default_channel",
                            icon: "stock_ticker_update",
                            color: "#3F51B5"
                        }
                    },
                    apns: {
                        payload: { aps: { 'content-available': 1, sound: 'default', badge: 1 } },
                        headers: { 'apns-priority': '10' },
                    },
                    webpush: {
                        headers: { Urgency: "high" },
                        notification: {
                            title,
                            body,
                            icon: '/icons/icon-192x192.png',
                            badge: '/icons/icon-192x192.png',
                            tag: `activity_checkin_${playerDoc.id}`,
                            renotify: true
                        },
                        fcmOptions: { link: '/chat' }
                    }
                };
            }


            if (notificationPayload) {
                await admin.messaging().sendEachForMulticast({ tokens, ...notificationPayload });
                notificationsSent++;
            }
        }
        console.log(`✅ Daily check-in reminders sent to ${notificationsSent} players.`);
    } catch (error) {
        console.error("❌ Fout bij dailyCheckInReminder:", error);
    }
});


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
                const { clubId, teamId, alertId } = context.params;

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
                     const title = `Broos Alert: ${alertData.alertType || "Aandacht!"}`;
                     const body = alertData.triggeringMessage || "Nieuwe analyse beschikbaar.";

                     const notificationPayload = {
                        notification: { title, body },
                        data: {
                            link: "/alerts",
                            type: "ALERT",
                            alertId: alertId,
                        },
                        android: { 
                            priority: 'high',
                            notification: {
                                channel_id: "alerts_channel",
                                icon: "stock_ticker_update",
                                color: "#cf222e" // Destructive color
                            }
                        },
                        apns: {
                            payload: { aps: { 'content-available': 1, sound: 'default', badge: 1 } },
                            headers: { 'apns-priority': '10' },
                        },
                        webpush: {
                            headers: { Urgency: "high" },
                            notification: {
                                title,
                                body,
                                icon: '/icons/icon-192x192.png',
                                badge: '/icons/icon-192x192.png',
                                tag: `alert_${alertId}`,
                                renotify: true,
                            },
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

async function getTokensForUser(userId: string): Promise<string[]> {
    const snap = await admin.firestore().collection('users').doc(userId).collection('fcmTokens').get();
    if (snap.empty) {
        return [];
    }
    return snap.docs.map(doc => doc.id);
}


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
