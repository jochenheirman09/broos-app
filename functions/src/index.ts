
import * as functions from 'firebase-functions/v1'; // Voor je bestaande v1 triggers
import { onSchedule } from "firebase-functions/v2/scheduler"; // Voor de nieuwe cronjob
import * as admin from 'firebase-admin';
import { runAnalysisJob } from "../../src/actions/cron-actions";
import { FieldValue } from 'firebase-admin/firestore';

// Initialiseer Admin SDK (slechts één keer nodig)
if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * 1. NIGHTLY ANALYSIS JOB (v2 Scheduler)
 * Draait elke nacht om 03:00 om inzichten en weetjes te genereren.
 * Stuurt GEEN notificaties meer.
 */
export const nightlyAnalysis = onSchedule({
    schedule: "0 3 * * *",
    timeZone: "Europe/Brussels",
    memory: "1GiB", 
    timeoutSeconds: 540,
    secrets: ["GEMINI_API_KEY"],
}, async (event) => {
    console.log("--- START CRON JOB: Nightly Analysis (Generates data) ---");
    try {
        await runAnalysisJob();
        console.log("--- CRON JOB SUCCESS ---");
    } catch (error) {
        console.error("--- CRON JOB FAILED ---", error);
    }
});

/**
 * 2. INITIAL USER CLAIMS (v1 Auth Trigger)
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

/**
 * 3. FIX USER CLAIMS (v1 HTTP Trigger)
 * Handmatige herstel-functie voor specifieke UIDs.
 */
export const fixUserClaims = functions.https.onRequest(async (req, res) => {
    const uid = "sPMqxc2bXAWMDuaW03DlVpss2Ol2";

    try {
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        
        if (!userDoc.exists) {
            res.status(404).send("User niet gevonden in Firestore.");
            return;
        }

        const userData = userDoc.data();
        const role = userData?.role || "player";
        const clubId = userData?.clubId || "";
        const teamId = userData?.teamId || "";

        const claims = { role, clubId, teamId };

        await admin.auth().setCustomUserClaims(uid, claims);
        const user = await admin.auth().getUser(uid);
        
        res.status(200).send({
            message: `Success! Claims bijgewerkt naar de data uit Firestore (Rol: ${role})`,
            uid: uid,
            appliedClaims: user.customClaims
        });
    } catch (error: any) {
        res.status(500).send("Fout: " + error.message);
    }
});

/**
 * 4. ON ALERT CREATED (v1 Firestore Trigger)
 * Stuurt direct een pushmelding wanneer de AI een nieuwe alert genereert.
 */
export const onAlertCreated = functions.firestore
    .document('clubs/{clubId}/teams/{teamId}/alerts/{alertId}')
    .onCreate(async (snapshot, context) => {
        const alertData = snapshot.data();
        if (!alertData) return null;

        const { clubId, teamId, userId: playerId, alertType, triggeringMessage } = alertData;

        try {
            const db = admin.firestore();
            
            const playerDoc = await db.collection('users').doc(playerId).get();
            const playerName = playerDoc.exists() ? playerDoc.data()?.name || 'een speler' : 'een speler';
            
            const staffQuery = db.collection('users').where('teamId', '==', teamId).where('role', '==', 'staff').get();
            const responsibleQuery = db.collection('users').where('clubId', '==', clubId).where('role', '==', 'responsible').get();
            
            const [staffSnapshot, responsibleSnapshot] = await Promise.all([staffQuery, responsibleQuery]);
            
            const recipients = new Map<string, any>();
            staffSnapshot.forEach(doc => recipients.set(doc.id, doc.data()));
            responsibleSnapshot.forEach(doc => recipients.set(doc.id, doc.data()));

            if (recipients.size === 0) {
                console.log(`No staff or responsible users found for team ${teamId} / club ${clubId}.`);
                return null;
            }

            let allTokens: string[] = [];
            for (const recipientId of recipients.keys()) {
                const userTokens = await getTokensForUser(recipientId);
                allTokens.push(...userTokens);
            }
            
            allTokens = [...new Set(allTokens)];

            if (allTokens.length === 0) {
                console.log(`No FCM tokens found for any recipients in team ${teamId}.`);
                return null;
            }

            const title = `Nieuwe Alert: ${alertType} voor ${playerName}`;
            const body = `Een nieuwe alert is gedetecteerd: "${triggeringMessage}"`;

            const payload = {
                notification: { title, body },
                data: { type: "ALERT", alertId: context.params.alertId, click_action: "FLUTTER_NOTIFICATION_CLICK" }
            };

            const response = await admin.messaging().sendToDevice(allTokens, payload);
            console.log(`✅ Alert notification sent to ${response.successCount} devices for alert ${context.params.alertId}.`);

            return null;
        } catch (error) {
            console.error("❌ Fout bij versturen van alert notificatie:", error);
            return null;
        }
    });

/**
 * 5. MORNING SUMMARY (v2 Scheduler)
 * Stuurt om 08:30 een melding naar spelers (Weetjes) en staf (Inzichten).
 */
export const morningSummary = onSchedule({
    schedule: "30 8 * * *",
    timeZone: "Europe/Brussels",
    memory: "512MiB",
}, async (event) => {
    const db = admin.firestore();
    const today = new Date().toISOString().split('T')[0];

    try {
        const staffUsers = await db.collection('users').where('role', 'in', ['staff', 'responsible']).get();
        
        for (const userDoc of staffUsers.docs) {
            const tokens = await getTokensForUser(userDoc.id);
            if (tokens.length > 0) {
                await admin.messaging().sendToDevice(tokens, {
                    notification: {
                        title: "Nieuwe Team Inzichten",
                        body: "De nachtelijke analyse is klaar. Bekijk de nieuwe updates op je dashboard."
                    }
                });
            }
        }

        const players = await db.collection('users').where('role', '==', 'player').get();
        for (const playerDoc of players.docs) {
            const tokens = await getTokensForUser(playerDoc.id);
            if (tokens.length > 0) {
                await admin.messaging().sendToDevice(tokens, {
                    notification: {
                        title: "Nieuw Weetje!",
                        body: "Hey! Er staat een nieuw persoonlijk inzicht voor je klaar in de Broos app."
                    }
                });
            }
        }
        console.log("✅ Morning summaries verstuurd.");
    } catch (error) {
        console.error("❌ Fout bij morningSummary:", error);
    }
});

/**
 * 6. DAILY CHECK-IN REMINDER (v2 Scheduler)
 * Stuurt om 17:00 een herinnering naar spelers die nog niet ingecheckt hebben.
 */
export const dailyCheckInReminder = onSchedule({
    schedule: "0 17 * * *",
    timeZone: "Europe/Brussels",
}, async (event) => {
    const db = admin.firestore();
    const players = await db.collection('users').where('role', '==', 'player').get();
    
    for (const playerDoc of players.docs) {
        const tokens = await getTokensForUser(playerDoc.id);
        if (tokens.length > 0) {
            await admin.messaging().sendToDevice(tokens, {
                notification: {
                    title: "Check-in met Broos!",
                    body: `Vergeet je check-in niet! Hey ${playerDoc.data().name || 'buddy'}, je buddy wacht op je.`
                }
            });
        }
    }
});


/**
 * Helper functie om tokens op te halen (Herbruikbaar)
 */
async function getTokensForUser(userId: string): Promise<string[]> {
    const snap = await admin.firestore().collection('users').doc(userId).collection('fcmTokens').get();
    return snap.docs.map(doc => doc.id);
}
