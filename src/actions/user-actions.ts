
"use server";
import { getFirebaseAdmin } from "@/ai/genkit";
import { UserProfile, WithId, Club, Team } from "@/lib/types";
import { GenkitError } from "genkit";
import { getStorage } from "firebase-admin/storage";
import { FieldValue } from 'firebase-admin/firestore';
import { getDocs } from "firebase/firestore";


// Function to generate a random 8-character alphanumeric code
const generateCode = (length = 8) => {
  const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};


/**
 * SERVER ACTION to create a club and set admin claims.
 * This is a secure, server-only operation.
 */
export async function createClubWithLogo(userId: string, clubName: string, logoDataURL?: string): Promise<{ success: boolean; message: string; }> {
    if (!userId || !clubName) {
        return { success: false, message: "Gebruikers-ID en clubnaam zijn vereist." };
    }
    const { adminDb, adminAuth } = await getFirebaseAdmin();
    const clubRef = adminDb.collection("clubs").doc();

    try {
        const batch = adminDb.batch();
        batch.set(clubRef, {
            name: clubName,
            ownerId: userId,
            id: clubRef.id,
            invitationCode: generateCode(),
            ...(logoDataURL && { logoURL: logoDataURL }),
        });
        batch.update(adminDb.collection("users").doc(userId), { clubId: clubRef.id });
        await batch.commit();

        await adminAuth.setCustomUserClaims(userId, { clubId: clubRef.id, role: 'responsible' });
        
        return { success: true, message: `Club '${clubName}' succesvol aangemaakt.` };
    } catch (error: any) {
        console.error("[Club Action] Fout bij aanmaken club met logo:", error);
        return { success: false, message: error.message || "Kon de club niet aanmaken." };
    }
}

/**
 * Updates an existing club's logo by saving the new logo as a base64 data URL.
 * @param clubId The ID of the club to update.
 * @param logoDataURL The new base64-encoded logo data URL.
 * @returns An object indicating success or failure.
 */
export async function updateClubLogo(clubId: string, logoDataURL: string): Promise<{ success: boolean; message: string; }> {
    if (!clubId || !logoDataURL) {
        return { success: false, message: "Club ID en logo zijn vereist." };
    }
    const { adminDb } = await getFirebaseAdmin();
    const clubRef = adminDb.collection("clubs").doc(clubId);

    try {
        await clubRef.update({ logoURL: logoDataURL });
        return { success: true, message: "Clublogo succesvol bijgewerkt." };
    } catch (error: any) {
        console.error("[Club Action] Fout bij het bijwerken van clublogo:", error);
        return { success: false, message: error.message || "Kon het clublogo niet bijwerken." };
    }
}


export async function generateClubInvitationCode(clubId: string): Promise<{ success: boolean; message: string; }> {
    if (!clubId) {
        return { success: false, message: "Club ID is required." };
    }

    console.log(`[Club Action] Generating new invitation code for club ${clubId}`);
    const { adminDb } = await getFirebaseAdmin();
    const clubRef = adminDb.collection("clubs").doc(clubId);

    const newCode = generateCode();

    try {
        await clubRef.update({ invitationCode: newCode });
        console.log(`[Club Action] Successfully updated invitation code for club ${clubId}.`);
        return { success: true, message: "Nieuwe code succesvol gegenereerd." };
    } catch (error: any) {
        console.error(`[Club Action] Error generating new code for club ${clubId}:`, error);
        return { success: false, message: "Kon geen nieuwe code genereren." };
    }
}

/**
 * SERVER ACTION to create a club and set admin claims.
 * This is a secure, server-only operation.
 */
export async function createClubAndSetClaims(userId: string, clubName: string, logoDataURL?: string): Promise<{ success: boolean; message: string; }> {
    if (!userId || !clubName) {
        return { success: false, message: "User ID and club name are required." };
    }
    
    console.log(`[Club Action] createClubAndSetClaims invoked for user ${userId} and club ${clubName}`);
    const { adminDb, adminAuth, adminApp } = await getFirebaseAdmin();
    const userRef = adminDb.collection("users").doc(userId);

    try {
        const userDoc = await userRef.get();
        const userData = userDoc.data();

        if (!userDoc.exists || !userData || userData.role !== 'responsible') {
            return { success: false, message: "Alleen een 'responsible' kan een club aanmaken." };
        }
        
        if (userData.clubId) {
            console.log(`[Club Action] User ${userId} already has clubId ${userData.clubId}. Refreshing claims.`);
             await adminAuth.setCustomUserClaims(userId, {
                clubId: userData.clubId,
                role: 'responsible',
            });
            return { success: true, message: "Je account is al gekoppeld aan een club. Rechten zijn hersteld." };
        }


        const clubsRef = adminDb.collection("clubs");
        const q = clubsRef.where("name", "==", clubName).limit(1);
        const querySnapshot = await q.get();

        if (!querySnapshot.empty) {
            return { success: false, message: `Een club met de naam "${clubName}" bestaat al.`};
        }

        const clubRef = clubsRef.doc();
        
        console.log(`[Club Action] Creating new club "${clubName}".`);
        const batch = adminDb.batch();
        
        batch.set(clubRef, {
            name: clubName,
            ownerId: userId,
            id: clubRef.id,
            invitationCode: generateCode(),
            ...(logoDataURL && { logoURL: logoDataURL }),
        });
        
        batch.update(userRef, { clubId: clubRef.id });
        await batch.commit();

        await adminAuth.setCustomUserClaims(userId, {
            clubId: clubRef.id,
            role: 'responsible',
        });
        
        console.log(`[Club Action] New club created and claims set for user ${userId}.`);
        return { success: true, message: `Club '${clubName}' succesvol aangemaakt.` };

    } catch (error: any) {
        console.error("[Club Action] Error:", error);
        return { success: false, message: error.message || "An unexpected error occurred." };
    }
}


/**
 * Validates a team invitation code across all clubs and returns the team and club IDs.
 * This is an internal helper function and should be called by an authorized server action.
 * @param db The Firestore admin instance.
 * @param teamCode The invitation code to validate.
 * @returns An object with teamId and clubId, or null if not found.
 */
async function validateTeamCode(db: any, teamCode: string): Promise<{ teamId: string; clubId: string } | null> {
  console.log(`[User Action] Entering validateTeamCode with code: ${teamCode}`);
  
  if (!db) {
      console.error("[User Action][validateTeamCode] CRITICAL: db instance is null or undefined.");
      throw new Error("Database service is niet beschikbaar.");
  }

  const teamQuery = db.collectionGroup("teams")
    .where("invitationCode", "==", teamCode)
    .limit(1);

  const teamSnapshot = await teamQuery.get();

  if (teamSnapshot.empty) {
    console.log(`[User Action] No team found for code: ${teamCode}`);
    return null;
  }
  
  const teamDoc = teamSnapshot.docs[0];
  const teamData = teamDoc.data() as Team;
  console.log(`[User Action] Found team: ${teamDoc.id} in club: ${teamData.clubId}`);
  
  return {
    teamId: teamDoc.id,
    clubId: teamData.clubId,
  };
}

/**
 * Server Action to securely update a user's team affiliation.
 * This is used for both completing a profile and changing teams.
 * It now also sets the custom claims for the user.
 * @param userId The UID of the user to update.
 * @param teamCode The new team invitation code.
 * @param updates Additional profile data to update (e.g., birthDate).
 * @returns An object indicating success or failure.
 */
export async function updateUserTeam(userId: string, teamCode: string, updates: Partial<UserProfile> = {}): Promise<{ success: boolean; message: string }> {
  if (!userId || !teamCode) {
    return { success: false, message: "Gebruikers-ID en teamcode zijn vereist." };
  }

  console.log(`[User Action] Starting updateUserTeam for user ${userId}`);
  const { adminDb: db, adminAuth } = await getFirebaseAdmin();
  const userRef = db.collection('users').doc(userId);
  
  try {
    const userDoc = await userRef.get();
    const userProfile = userDoc.data() as UserProfile | undefined;
    
    if (!userProfile) {
      throw new Error("Gebruiker niet gevonden.");
    }

    const teamInfo = await validateTeamCode(db, teamCode);
    if (!teamInfo) {
      return { success: false, message: "Team niet gevonden. Controleer de code en probeer opnieuw." };
    }

    // Security Check: A user can only switch to a team within their existing club.
    if (userProfile.clubId && userProfile.clubId !== teamInfo.clubId) {
        return { success: false, message: "Fout: Je kunt alleen wisselen naar een team binnen je eigen club." };
    }

    const finalUpdates: { [key: string]: any } = {
      ...updates,
      teamId: teamInfo.teamId,
      // Only set clubId if it doesn't exist yet (for profile completion)
      ...(userProfile.clubId ? {} : { clubId: teamInfo.clubId }),
    };
    
    await adminAuth.setCustomUserClaims(userId, {
        clubId: userProfile.clubId || teamInfo.clubId,
        teamId: teamInfo.teamId,
        role: userProfile.role
    });
    console.log(`[User Action] Custom claims set for user ${userId}: role=${userProfile.role}, clubId=${userProfile.clubId || teamInfo.clubId}, teamId=${teamInfo.teamId}`);

    await userRef.update(finalUpdates);
    
    console.log(`[User Action] User ${userId} successfully updated team to ${teamInfo.teamId}`);
    return { success: true, message: "Team succesvol bijgewerkt! Het kan nodig zijn om de app te herladen." };

  } catch (error: any) {
    console.error(`[User Action] Error updating team for user ${userId}:`, error);
    return { success: false, message: error.message || "Er is een serverfout opgetreden." };
  }
}


/**
 * Server Action to securely fetch data needed for the chat partner selection UI.
 * Returns a structured object with teams and their members.
 */
export async function getChatPartnersData(userId: string): Promise<{ teams: WithId<Team>[]; members: WithId<UserProfile>[] }> {
  if (!userId) {
    throw new Error("User ID must be provided.");
  }
  
  console.log(`[User Action] Fetching chat partners for user: ${userId}`);
  const { adminDb } = await getFirebaseAdmin();

  const userRef = adminDb.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists()) { 
    throw new GenkitError({ status: 'NOT_FOUND', message: 'Current user profile not found.' });
  }
  const userProfile = userDoc.data() as UserProfile;
  
  if (!userProfile.clubId) {
      console.log('[User Action] Current user profile is incomplete (missing clubId). Returning empty data.');
      return { teams: [], members: [] };
  }

  let membersQuery;
  let teamsQuery;

  if (userProfile.role === 'responsible') {
    console.log(`[User Action] User is responsible, querying for all users and teams in clubId: ${userProfile.clubId}`);
    membersQuery = adminDb.collection('users').where('clubId', '==', userProfile.clubId);
    teamsQuery = adminDb.collection('clubs').doc(userProfile.clubId).collection('teams');
  } else {
    if (!userProfile.teamId) {
        return { teams: [], members: [] };
    }
    console.log(`[User Action] User is staff/player, querying for users and team in teamId: ${userProfile.teamId}`);
    membersQuery = adminDb.collection('users').where('teamId', '==', userProfile.teamId);
    teamsQuery = adminDb.collection('clubs').doc(userProfile.clubId).collection('teams').where('__name__', '==', userProfile.teamId);
  }

  const [membersSnapshot, teamsSnapshot] = await Promise.all([
    membersQuery.get(),
    teamsQuery.get()
  ]);
  
  const members = membersSnapshot.docs
    .map(doc => ({ ...doc.data() as UserProfile, id: doc.id }))
    .filter(partner => partner.uid !== userId && !!partner.clubId);
    
  const teams = teamsSnapshot.docs.map(doc => ({ ...doc.data() as Team, id: doc.id }));

  console.log(`[User Action] Found ${members.length} members and ${teams.length} teams.`);
  return { teams, members };
}


/**
 * Server Action to securely fetch the members of a specific team.
 * This is only allowed if the requesting user is part of the same club.
 */
export async function getTeamMembers(requesterId: string, teamId: string): Promise<WithId<UserProfile>[]> {
  if (!requesterId || !teamId) {
    throw new Error("Requesting user ID and Team ID are required.");
  }
  
  console.log(`[User Action] User ${requesterId} is requesting members for team ${teamId}`);
  const { adminDb } = await getFirebaseAdmin();

  const requesterRef = adminDb.collection('users').doc(requesterId);
  const requesterDoc = await requesterRef.get();

  if (!requesterDoc.exists()) {
    throw new Error("Aanvragende gebruiker niet gevonden.");
  }
  const requesterProfile = requesterDoc.data() as UserProfile;
  
  if (!requesterProfile.clubId) {
      throw new Error("Je hebt geen club en kunt geen teamleden opvragen.");
  }
  
  if (requesterProfile.role === 'staff' && requesterProfile.teamId !== teamId) {
      throw new Error("Je hebt geen toegang tot de leden van dit team.");
  }

  const membersQuery = adminDb.collection('users').where('teamId', '==', teamId);
  const snapshot = await membersQuery.get();
  
  if (snapshot.empty) {
    console.log(`[User Action] No members found for team ${teamId}.`);
    return [];
  }

  const members = snapshot.docs
    .map(doc => ({ ...doc.data() as UserProfile, id: doc.id }))
    .filter(member => member.clubId === requesterProfile.clubId);
  
  console.log(`[User Action] Found ${members.length} members for team ${teamId}.`);
  return members;
}

/**
 * Saves a user's FCM token to Firestore. This server action is idempotent:
 * it creates the token document if it doesn't exist, and updates the `lastSeen`
 * timestamp if it does.
 */
export async function saveFcmToken(userId: string, token: string): Promise<{ success: boolean; message: string }> {
    const logPrefix = `[Server Action - saveFcmToken] User: ${userId} |`;
    console.log(`${logPrefix} 🚀 Invoked with token: ${token.substring(0, 20)}...`);

    if (!userId || !token) {
        console.error(`${logPrefix} ❌ Aborted: User ID and token are required.`);
        return { success: false, message: "Gebruikers-ID en token zijn vereist." };
    }
    
    const { adminDb } = await getFirebaseAdmin();
    const tokenRef = adminDb.collection('users').doc(userId).collection('fcmTokens').doc(token);

    try {
        const doc = await tokenRef.get();
        
        if (!doc.exists) {
            console.log(`${logPrefix} ℹ️ Token does not exist. Creating new document.`);
            await tokenRef.set({
                token: token,
                createdAt: FieldValue.serverTimestamp(),
                lastSeen: FieldValue.serverTimestamp(),
                platform: 'web',
            });
            console.log(`${logPrefix} ✅ Successfully CREATED token document.`);
            return { success: true, message: "Nieuw token succesvol opgeslagen." };
        } else {
            console.log(`${logPrefix} ℹ️ Token exists. Updating 'lastSeen' timestamp.`);
            await tokenRef.update({ lastSeen: FieldValue.serverTimestamp() });
            console.log(`${logPrefix} ✅ Successfully UPDATED token document.`);
            return { success: true, message: "Token is al up-to-date." };
        }
    } catch (error: any) {
        console.error(`${logPrefix} 🔥 CRITICAL: Error saving token to Firestore:`, error);
        return { success: false, message: error.message || "Failed to save token to database." };
    }
}
