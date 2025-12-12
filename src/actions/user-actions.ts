
'use server';

import { getFirebaseAdmin } from "@/ai/genkit";
import { UserProfile, WithId, Club, Team } from "@/lib/types";
import { GenkitError } from "genkit";
// CORRECTIE: Gebruik de types van de admin SDK, niet de client SDK functies
import type { Firestore } from 'firebase-admin/firestore';

/**
 * Validates a team invitation code across all clubs and returns the team and club IDs.
 * This is an internal helper function and should be called by an authorized server action.
 * @param db The Firestore admin instance.
 * @param teamCode The invitation code to validate.
 * @returns An object with teamId and clubId, or null if not found.
 */
async function validateTeamCode(db: Firestore, teamCode: string): Promise<{ teamId: string; clubId: string } | null> {
  console.log(`[User Action] CORRECTLY entering validateTeamCode with code: ${teamCode}`);
  
  if (!db) {
      console.error("[User Action][validateTeamCode] CRITICAL: db instance is null or undefined.");
      throw new Error("Database service is niet beschikbaar.");
  }

  // CORRECTIE: Gebruik admin SDK syntax
  const clubsSnapshot = await db.collection("clubs").get();

  if (clubsSnapshot.empty) {
    console.log("[User Action] No clubs found in the system.");
    return null;
  }
  console.log(`[User Action] Found ${clubsSnapshot.docs.length} clubs to search through.`);

  for (const clubDoc of clubsSnapshot.docs) {
    const club = { id: clubDoc.id, ...clubDoc.data() } as Club;
    // CORRECTIE: Gebruik admin SDK syntax voor subcollectie query
    const teamQuery = db.collection("clubs").doc(club.id).collection("teams")
      .where("invitationCode", "==", teamCode)
      .limit(1);

    const teamSnapshot = await teamQuery.get();

    if (!teamSnapshot.empty) {
      const teamDoc = teamSnapshot.docs[0];
      const teamData = teamDoc.data() as Team;
      console.log(`[User Action] Found team: ${teamDoc.id} in club: ${teamData.clubId}`);
      return {
        teamId: teamDoc.id,
        clubId: teamData.clubId,
      };
    }
  }

  console.log(`[User Action] No team found for code: ${teamCode}`);
  return null;
}

/**
 * Server Action to securely update a user's team affiliation.
 * This is used for both completing a profile and changing teams.
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
  const { adminDb: db } = await getFirebaseAdmin();
  const userRef = db.collection('users').doc(userId);
  console.log("[User Action] Admin DB and user reference obtained successfully.");

  try {
    const teamInfo = await validateTeamCode(db, teamCode);

    if (!teamInfo) {
      return { success: false, message: "Team niet gevonden. Controleer de code en probeer opnieuw." };
    }

    const finalUpdates: { [key: string]: any } = {
      ...updates,
      teamId: teamInfo.teamId,
      clubId: teamInfo.clubId,
    };
    
    await userRef.update(finalUpdates);
    
    console.log(`[User Action] User ${userId} successfully updated team to ${teamInfo.teamId}`);
    return { success: true, message: "Team succesvol bijgewerkt!" };

  } catch (error: any) {
    console.error(`[User Action] Error updating team for user ${userId}:`, error);
    return { success: false, message: error.message || "Er is een serverfout opgetreden." };
  }
}


/**
 * Server Action to securely fetch a list of potential chat partners
 * based on the current user's role and affiliation.
 */
export async function getChatPartners(userId: string): Promise<WithId<UserProfile>[]> {
  if (!userId) {
    throw new Error("User ID must be provided.");
  }
  
  console.log(`[User Action] Fetching chat partners for user: ${userId}`);
  const { adminDb } = await getFirebaseAdmin();

  const userRef = adminDb.collection('users').doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) { 
    throw new GenkitError({ status: 'NOT_FOUND', message: 'Current user profile not found.' });
  }
  const userProfile = userDoc.data() as UserProfile;
  
  if (!userProfile.clubId || !userProfile.teamId) {
      console.log('[User Action] Current user profile is incomplete (missing clubId or teamId). Returning empty list.');
      return [];
  }

  let chatPartnersQuery;

  if (userProfile.role === 'responsible') {
    console.log(`[User Action] User is responsible, querying for all users in clubId: ${userProfile.clubId}`);
    chatPartnersQuery = adminDb.collection('users')
        .where('clubId', '==', userProfile.clubId);
  } else {
    console.log(`[User Action] User is staff/player, querying for users in teamId: ${userProfile.teamId}`);
    chatPartnersQuery = adminDb.collection('users')
        .where('teamId', '==', userProfile.teamId);
  }

  const snapshot = await chatPartnersQuery.get();
  
  if (snapshot.empty) {
    console.log('[User Action] No chat partners found for the query.');
    return [];
  }

  const partners = snapshot.docs
    .map(doc => ({ ...doc.data() as UserProfile, id: doc.id }))
    .filter(partner => 
        partner.uid !== userId &&
        !!partner.clubId && 
        !!partner.teamId
    );

  console.log(`[User Action] Found ${partners.length} valid chat partners.`);
  return partners;
}
