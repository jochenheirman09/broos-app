
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
        console.log(msg);
        return { success: false, message: msg };
    }
    
    const tokens = tokensSnapshot.docs.map(doc => (doc.data() as FcmToken).token);

    const message: Message = {
        notification: { title, body },
        webpush: {
            notification: {
                icon: '/icons/icon-192x192.png',
            },
            fcmOptions: {
                link: link || '/',
            },
        },
        tokens: tokens,
    };

    try {
      const response = await messaging.sendEachForMulticast(message as any);
      console.log('Successfully sent message:', response);
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                failedTokens.push(tokens[idx]);
            }
        });
        console.log('List of tokens that caused failures: ' + failedTokens);
      }

      return { success: true, message: "Notification sent successfully." };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, message: "Failed to send notification." };
    }
  }
);
