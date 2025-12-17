
'use server';

import { getFirebaseAdmin } from "@/ai/genkit";
import { UserProfile } from "@/lib/types";

type AlertStatus = 'new' | 'acknowledged' | 'resolved';

/**
 * Updates the status of a specific alert.
 * This is a secure server action that verifies the user has the right to modify the alert.
 *
 * @param userId - The ID of the user performing the action.
 * @param clubId - The club ID associated with the alert.
 * @param teamId - The team ID associated with the alert.
 * @param alertId - The ID of the alert to update.
 * @param status - The new status to set.
 * @returns An object indicating success or failure.
 */
export async function updateAlertStatus(
    userId: string,
    clubId: string,
    teamId: string,
    alertId: string,
    status: AlertStatus
): Promise<{ success: boolean; message: string }> {
    if (!userId || !clubId || !teamId || !alertId || !status) {
        return { success: false, message: "Missing required parameters." };
    }

    console.log(`[Alert Action] User ${userId} attempting to set status '${status}' for alert ${alertId}`);

    const { adminDb } = await getFirebaseAdmin();
    
    try {
        const userRef = adminDb.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            throw new Error("User not found.");
        }
        const userProfile = userDoc.data() as UserProfile;

        // Security Check
        if (userProfile.clubId !== clubId) {
            throw new Error("Permission denied: User does not belong to the correct club.");
        }
        if (userProfile.role === 'staff' && userProfile.teamId !== teamId) {
            throw new Error("Permission denied: Staff member does not belong to the correct team.");
        }

        const alertRef = adminDb.collection('clubs').doc(clubId).collection('teams').doc(teamId).collection('alerts').doc(alertId);

        await alertRef.update({ status: status });
        
        console.log(`[Alert Action] Successfully updated alert ${alertId} to status '${status}'.`);
        return { success: true, message: `Alert status bijgewerkt naar '${status}'.` };

    } catch (error: any) {
        console.error(`[Alert Action] Failed to update alert status:`, error);
        return { success: false, message: error.message || "Kon de alert status niet bijwerken." };
    }
}
