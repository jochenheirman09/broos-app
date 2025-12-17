
"use server";

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
