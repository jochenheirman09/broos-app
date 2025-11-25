
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getMessaging, Message } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import type { FcmToken } from '@/lib/types';


export const NotificationInputSchema = z.object({
  userId: z.string(),
  title: z.string(),
  body: z.string(),
  link: z.string().optional(),
});
export type NotificationInput = z.infer<typeof NotificationInputSchema>;


export async function sendNotification(
  input: NotificationInput
): Promise<{ success: boolean; message: string }> {
    // LAZY INITIALIZATION: Define the flow inside the exported function
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
          console.log('Successfully sent message:', response);
          if (response.failureCount > 0) {
            const failedTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });
            console.log('List of tokens that caused failures: ' + failedTokens);
            // Here you could add logic to remove stale tokens from Firestore
          }

          return { success: true, message: "Notification sent successfully." };
        } catch (error) {
          console.error('Error sending message:', error);
          return { success: false, message: "Failed to send notification." };
        }
      }
    );
    // Execute the lazily-defined flow
    return notificationFlow(input);
}
