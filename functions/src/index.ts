import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp();
}

/**
 * Triggered after a new user is created in Firebase Authentication.
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
        const userRole = userProfileDoc.data()?.role || 'player'; // Default naar player als niet gevonden

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
 * GEAVANCEERDE FIX FUNCTIE
 * Haalt nu dynamisch de data uit Firestore ipv hardcoded 'admin'
 */
export const fixUserClaims = functions.https.onRequest(async (req, res) => {
    const uid = "sPMqxc2bXAWMDuaW03DlVpss2Ol2";

    try {
        // 1. Haal de echte data op uit Firestore
        const userDoc = await admin.firestore().collection('users').doc(uid).get();
        
        if (!userDoc.exists) {
            res.status(404).send("User niet gevonden in Firestore.");
            return;
        }

        const userData = userDoc.data();
        const role = userData?.role || "player";
        const clubId = userData?.clubId || "";
        const teamId = userData?.teamId || "";

        // 2. Bouw de claims op basis van de database (geen hardcoded admin meer!)
        const claims = {
            role: role,
            clubId: clubId,
            teamId: teamId
        };

        // 3. Forceer de claims
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