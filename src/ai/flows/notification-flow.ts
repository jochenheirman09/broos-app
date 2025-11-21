
'use server';
/**
 * @fileOverview A flow to send a push notification to a user.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getMessaging, Message } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import type { FcmToken } from '@/lib/types';
import { NotificationInputSchema, type NotificationInput } from '@/ai/types';


export async function sendNotification(
  input: NotificationInput
): Promise<{ success: boolean; message: string }> {
    return notificationFlow(input);
}


const notificationFlow = ai.defineFlow(
  {
    name: 'notificationFlow',
    inputSchema: NotificationInputSchema,
    outputSchema: z.object({ success: z.boolean(), message: z.string() }),
  },
  async ({ userId, title, body, link }) => {
    const db = getFirestore();
    const messaging = getMessaging();

    const tokensSnapshot = await db.collection('users').doc(userId).collection('fcmTokens').get();
    
    if (tokensSnapshot.empty) {
        const msg = `No FCM tokens found for user ${userId}. Cannot send notification.`;
        return { success: false, message: msg };
    }
    
    const tokens = tokensSnapshot.docs.map(doc => (doc.data() as FcmToken).token);

    const message: Message = {
        notification: { title, body },
        webpush: {
            notification: {
                icon: '/icons/icon-192x192.png',
                // You can add actions here, e.g., to open the app
            },
            fcmOptions: {
                link: link || '/', // Link to open when notification is clicked
            },
        },
        tokens: tokens, // Use tokens array here
    };

    try {
      const response = await messaging.sendEachForMulticast(message);
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                failedTokens.push(tokens[idx]);
            }
        });
      }

      return { success: true, message: "Notification sent successfully." };
    } catch (error) {
      return { success: false, message: "Failed to send notification." };
    }
  }
);
