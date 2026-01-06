
'use server';

import { sendNotification } from '@/ai/flows/notification-flow';

/**
 * Sends a test notification to the specified user.
 * This is a server action that can be called from the client to test the notification setup.
 *
 * @param userId The UID of the user to send the test notification to.
 * @returns An object indicating success or failure.
 */
export async function sendTestNotification(userId: string): Promise<{ success: boolean; message: string }> {
    if (!userId) {
        return { success: false, message: "User ID is required." };
    }

    console.log(`[Notification Action] Sending test notification to user ${userId}`);

    try {
        const result = await sendNotification({
            userId,
            title: "Test Melding van Broos 2.0",
            body: "Als je deze melding ontvangt, werken je notificaties correct! 🎉",
            link: "/dashboard",
        });

        if (result.success) {
            console.log(`[Notification Action] Test notification successfully sent to user ${userId}.`);
            return { success: true, message: "Testmelding is onderweg!" };
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        console.error(`[Notification Action] Failed to send test notification:`, error);
        return { success: false, message: error.message || "Kon de testmelding niet versturen." };
    }
}
