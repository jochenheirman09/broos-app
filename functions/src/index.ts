
import * as functions from 'firebase-functions/v1';
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// TIJDELIJK: Comment de import uit die buiten de folder gaat
// import { runAnalysisJob } from "../../src/actions/cron-actions";

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * 1. NIGHTLY ANALYSIS JOB
 * Tijdelijk uitgeschakeld om de rest te laten werken
 */
export const nightlyAnalysis = onSchedule({
    schedule: "0 3 * * *",
    timeZone: "Europe/Brussels",
}, async (event) => {
    console.log("Nightly job trigger ontvangen (AI-job tijdelijk gepauzeerd voor deploy)");
    // De aanroep naar runAnalysisJob() is hier tijdelijk verwijderd.
    return;
});

/**
 * 2. MORNING SUMMARY (08:30)
 */
export const morningSummary = onSchedule({
    schedule: "30 8 * * *",
    timeZone: "Europe/Brussels",
}, async (event) => {
    const db = admin.firestore();
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
    const db = admin.firestore();
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
                    }
                });
            }
        }
    } catch (error) {
        console.error("❌ Fout bij dailyCheckInReminder:", error);
    }
});


/**
 * 4. ON ALERT CREATED (v1) - Real-time
 */
export const onAlertCreated = functions.firestore
    .document('clubs/{clubId}/teams/{teamId}/alerts/{alertId}')
    .onCreate(async (snapshot, context) => {
        const alertData = snapshot.data();
        if (!alertData) return null;

        const { clubId, teamId } = context.params;

        try {
            const staffQuery = admin.firestore().collection('users').where('clubId', '==', clubId).where('role', '==', 'staff').where('teamId', '==', teamId);
            const responsibleQuery = admin.firestore().collection('users').where('clubId', '==', clubId).where('role', '==', 'responsible');

            const [staffSnap, responsibleSnap] = await Promise.all([staffQuery.get(), responsibleQuery.get()]);
            
            const tokenSet = new Set<string>();
            
            const processSnapshot = async (snap: FirebaseFirestore.QuerySnapshot) => {
                 for (const doc of snap.docs) {
                    const tokens = await getTokensForUser(doc.id);
                    tokens.forEach(t => {
                        if (t && t.trim() !== "") {
                            tokenSet.add(t);
                        }
                    });
                }
            }
            
            await processSnapshot(staffSnap);
            await processSnapshot(responsibleSnap);
           
            const uniqueTokens = Array.from(tokenSet);


            if (uniqueTokens.length > 0) {
                const message = {
                    tokens: uniqueTokens,
                    notification: {
                        title: `Broos Alert: ${alertData.alertType || "Aandacht!"}`,
                        body: alertData.triggeringMessage || "Nieuwe analyse beschikbaar."
                    },
                    data: {
                        click_action: "FLUTTER_NOTIFICATION_CLICK",
                        type: "ALERT",
                        alertId: context.params.alertId
                    }
                };
                const response = await admin.messaging().sendEachForMulticast(message);
                console.log(`✅ Alert verstuurd naar ${response.successCount} unieke apparaten.`);

                // Bonus: Clean up invalid tokens
                response.responses.forEach((resp, idx) => {
                    if (!resp.success && resp.error) {
                        const errorCode = resp.error.code;
                        if (errorCode === 'messaging/registration-token-not-registered' || 
                            errorCode === 'messaging/invalid-registration-token') {
                            const invalidToken = uniqueTokens[idx];
                            console.log(`🧹 Verlopen token gedetecteerd: ${invalidToken}. Deze moet worden verwijderd.`);
                            // Optional: Add logic here to delete the token from Firestore.
                        }
                    }
                });
            }
            return null;
        } catch (error) {
            console.error("❌ Alert Notification Error", error);
            return null;
        }
    });

/**
 * HELPER: Tokens ophalen
 */
async function getTokensForUser(userId: string): Promise<string[]> {
    const snap = await admin.firestore().collection('users').doc(userId).collection('fcmTokens').get();
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
