import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';

// Initialize Admin SDK (slechts één keer)
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
        // 1. Read the temporary registration document
        const registrationRef = admin.firestore().doc(`user_registrations/${uid}`);
        const registrationSnap = await registrationRef.get();
        
        if (!registrationSnap.exists) {
            console.log(`Registration document not found for ${uid}. This is normal for a 'responsible' role.`);
            return null;
        }

        const invitationCode = registrationSnap.data()?.invitationCode;
        if (!invitationCode) {
            console.error(`Invitation code is missing in registration document for ${uid}.`);
            await registrationRef.delete();
            return null;
        }

        // 2. Find the team with the invitation code
        const teamsQuery = admin.firestore().collectionGroup('teams').where('invitationCode', '==', invitationCode).limit(1);
        const teamSnapshot = await teamsQuery.get();

        if (teamSnapshot.empty) {
            console.error(`Team with invitation code "${invitationCode}" not found. Claims not set for ${uid}.`);
            await registrationRef.delete();
            return null;
        }

        const teamDoc = teamSnapshot.docs[0];
        const teamId = teamDoc.id;
        const clubId = teamDoc.data().clubId;

        if (!clubId) {
             console.error(`Critical: Club ID is missing in team document ${teamId}. Claims not set for ${uid}.`);
             await registrationRef.delete();
             return null;
        }
        
        // Get the role from the user's permanent profile document
        const userProfileDoc = await admin.firestore().collection('users').doc(uid).get();
        const userRole = userProfileDoc.data()?.role;

        if (!userRole) {
            console.error(`User profile or role not found for ${uid}. Cannot set claims.`);
            await registrationRef.delete();
            return null;
        }

        // 3. Set the Custom Claims
        const customClaims = { role: userRole, clubId, teamId };
        await admin.auth().setCustomUserClaims(uid, customClaims);
        
        // 4. Update the permanent user document
        await admin.firestore().collection('users').doc(uid).update({ clubId, teamId });

        // 5. Clean up
        await registrationRef.delete(); 

        console.log(`✅ Claims successfully set for new user ${uid}: ${JSON.stringify(customClaims)}`);
        return null;

    } catch (error) {
        console.error(`❌ Critical error setting claims for ${uid}:`, error);
        return null;
    }
});

/**
 * TIJDELIJKE FIX FUNCTIE
 * Run dit via: firebase deploy --only functions:fixUserClaims
 * Roep daarna de URL aan in je browser.
 */
export const fixUserClaims = functions.https.onRequest(async (req, res) => {
    const uid = "sPMqxc2bXAWMDuaW03DlVpss2Ol2";
    const claims = {
        admin: true,
        role: "admin",
        clubId: "udj0TS8Z0eOsvrqhLyWP"
    };

    try {
        // Forceer de claims op de server
        await admin.auth().setCustomUserClaims(uid, claims);
        
        // Haal de gebruiker opnieuw op om te verifiëren
        const user = await admin.auth().getUser(uid);
        
        res.status(200).send({
            message: "Success! Claims zijn handmatig bijgewerkt voor test-user.",
            uid: uid,
            appliedClaims: user.customClaims
        });
    } catch (error: any) {
        console.error("Error in fixUserClaims:", error);
        res.status(500).send("Fout bij bijwerken: " + error.message);
    }
});