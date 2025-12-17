
'use server';

import { getFirebaseAdmin } from "@/ai/genkit";
import { UserProfile } from "@/lib/types";

/**
 * A server action to read a user's profile from Firestore and forcefully
 * apply their role, clubId, and teamId as custom claims on their Auth record.
 * This is a powerful debugging tool to fix users with stale auth tokens.
 *
 * @param userId The UID of the user to repair.
 * @returns An object indicating success, a message, and the claims that were set.
 */
export async function handleRepairUserClaims(userId: string): Promise<{ success: boolean; message: string; claims?: any; }> {
    if (!userId) {
        return { success: false, message: "User ID is vereist." };
    }

    console.log(`[Repair Action] Starting claim repair for user ${userId}`);
    const { adminDb, adminAuth } = await getFirebaseAdmin();
    
    try {
        const userRef = adminDb.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            throw new Error("Gebruiker niet gevonden in Firestore. Account kan niet worden hersteld.");
        }
        
        const userProfile = userDoc.data() as UserProfile;
        
        const claimsToSet = {
            role: userProfile.role || null,
            clubId: userProfile.clubId || null,
            teamId: userProfile.teamId || null,
        };

        await adminAuth.setCustomUserClaims(userId, claimsToSet);
        
        console.log(`[Repair Action] Successfully set claims for ${userId}:`, claimsToSet);
        return { 
            success: true, 
            message: "Accountrechten succesvol hersteld.",
            claims: claimsToSet,
        };

    } catch (error: any) {
        console.error(`[Repair Action] Failed to repair claims for user ${userId}:`, error);
        return { success: false, message: error.message || "Kon de accountrechten niet herstellen." };
    }
}
