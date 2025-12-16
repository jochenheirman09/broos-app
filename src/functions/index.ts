
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Admin SDK
admin.initializeApp();

/**
 * Triggered after a new user is created in Firebase Authentication.
 * This function reads a temporary document from 'user_registrations' which should contain
 * the team invitation code entered by the user. It then uses a collection group query
 * to find the team, determines the clubId, and sets the custom claims on the user.
 */
export const setInitialUserClaims = functions.auth.user().onCreate(async (user) => {
    
    const uid = user.uid;

    if (!user.email) {
        console.warn(`User ${uid} was created without an email address. Skipping claims setup.`);
        return null;
    }

    try {
        // 1. Read the temporary registration document to get the team invitation code.
        const registrationRef = admin.firestore().doc(`user_registrations/${uid}`);
        const registrationSnap = await registrationRef.get();
        
        if (!registrationSnap.exists) {
            // This is expected for 'responsible' users who don't enter a code.
            console.log(`Registration document not found for ${uid}. This is normal for a 'responsible' role.`);
            return null;
        }

        const invitationCode = registrationSnap.data()?.invitationCode;
        if (!invitationCode) {
            console.error(`Invitation code is missing in registration document for ${uid}.`);
            await registrationRef.delete(); // Clean up invalid document
            return null;
        }

        // 2. Use a collection group query to find the team with the given invitation code.
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
        
        // Get the role from the user's permanent profile document created on the client
        const userProfileDoc = await admin.firestore().collection('users').doc(uid).get();
        const userRole = userProfileDoc.data()?.role;

        if (!userRole) {
            console.error(`User profile or role not found for ${uid}. Cannot set claims.`);
            await registrationRef.delete();
            return null;
        }

        // 3. Set the Custom Claims on the user's authentication record.
        const customClaims = { role: userRole, clubId, teamId };
        await admin.auth().setCustomUserClaims(uid, customClaims);
        
        // 4. Update the permanent user document with the resolved IDs.
        await admin.firestore().collection('users').doc(uid).update({ clubId, teamId });

        // 5. Clean up the temporary registration document.
        await registrationRef.delete(); 

        console.log(`✅ Claims successfully set for new user ${uid}: ${JSON.stringify(customClaims)}`);
        return null;

    } catch (error) {
        console.error(`❌ Critical error setting claims for ${uid}:`, error);
        return null;
    }
});
