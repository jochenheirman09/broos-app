
import * as functions from 'firebase-functions/v1'; // Voor je bestaande v1 triggers
import { onSchedule } from "firebase-functions/v2/scheduler"; // Voor de nieuwe cronjob
import * as admin from 'firebase-admin';
import { runAnalysisJob } from "../../src/actions/cron-actions";

// Initialiseer Admin SDK (slechts één keer nodig)
if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * 1. NIGHTLY ANALYSIS JOB (v2 Scheduler)
 * Draait elke nacht om 03:00 om inzichten en weetjes te genereren.
 */
export const nightlyAnalysis = onSchedule({
    schedule: "0 3 * * *",
    timeZone: "Europe/Brussels",
    memory: "1GiB", 
    timeoutSeconds: 540, 
}, async (event) => {
    console.log("--- START CRON JOB: Nightly Analysis ---");
    try {
        // Genereert data in /updates, /staffUpdates en /clubUpdates via Admin SDK
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
