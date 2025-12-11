
'use server';

import { getFirebaseAdmin } from '@/ai/genkit';
import type { FcmToken } from '@/lib/types';
import type { Message } from 'firebase-admin/messaging';
import { type NotificationInput } from '@/ai/types';


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
      // Firebase Admin SDK's sendMulticast is deprecated, but send handles arrays now.
      const response = await adminMessaging.send(message as any); 
      console.log('Successfully sent message:', response);

      return { success: true, message: "Notification sent successfully." };
    } catch (error) {
      console.error('Error sending message:', error);
      return { success: false, message: "Failed to send notification." };
    }
}
