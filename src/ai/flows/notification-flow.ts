
'use server';
import { getFirebaseAdmin } from '../genkit';
import type { FcmToken } from '../../lib/types';
import type { MulticastMessage } from 'firebase-admin/messaging';
import { type NotificationInput } from '../types';


export async function sendNotification(
  input: NotificationInput
): Promise<{ success: boolean; message: string }> {
    const { userId, title, body, link } = input;
    const { adminDb, adminMessaging } = await getFirebaseAdmin();

    const tokensSnapshot = await adminDb.collection('users').doc(userId).collection('fcmTokens').get();
    
    if (tokensSnapshot.empty) {
        const msg = `No FCM tokens found for user ${userId}. Cannot send notification.`;
        console.log(msg);
        return { success: false, message: msg };
    }
    
    const tokens = tokensSnapshot.docs.map(doc => (doc.data() as FcmToken).token);

    const message: MulticastMessage = {
        notification: { title, body },
        webpush: {
            notification: {
                icon: '/icons/icon-192x192.png',
            },
            fcmOptions: {
                link: link || '/',
            },
            headers: {
                Urgency: 'high'
            }
        },
        android: {
            priority: 'high'
        },
        tokens: tokens,
    };

    try {
      const response = await adminMessaging.sendEachForMulticast(message);
      console.log('Successfully sent message:', response);

      if (response.failureCount > 0) {
        console.warn(`Failed to send notification to ${response.failureCount} tokens.`);
        // Optional: Clean up invalid tokens
      }

      return { success: true, message: "Notification sent successfully." };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, message: "Failed to send notification." };
    }
}
