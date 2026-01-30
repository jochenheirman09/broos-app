
'use server';

import { getFirebaseAdmin } from "@/ai/genkit";

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
 * Creates a new club, storing the provided logo as a base64 data URL in Firestore.
 * @param userId The UID of the user creating the club.
 * @param clubName The name of the new club.
 * @param sport The sport associated with the club.
 * @param logoDataURL The base64-encoded data URL of the logo image.
 * @returns An object indicating success or failure.
 */
export async function createClubWithLogo(userId: string, clubName: string, sport: string, logoDataURL?: string): Promise<{ success: boolean; message: string; }> {
    if (!userId || !clubName || !sport) {
        return { success: false, message: "Gebruikers-ID, clubnaam en sport zijn vereist." };
    }
    const { adminDb, adminAuth } = await getFirebaseAdmin();
    const clubRef = adminDb.collection("clubs").doc();

    try {
        const batch = adminDb.batch();
        batch.set(clubRef, {
            name: clubName,
            ownerId: userId,
            id: clubRef.id,
            sport: sport, // Save the selected sport
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
