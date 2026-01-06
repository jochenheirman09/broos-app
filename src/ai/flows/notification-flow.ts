
'use server';
import { getFirebaseAdmin } from '../genkit';
import type { FcmToken } from '../../lib/types';
import type { MulticastMessage } from 'firebase-admin/messaging';
import { type NotificationInput } from '../types';


export async function sendNotification(
  input: NotificationInput
): Promise<{ success: boolean; message: string }> {
    const { userId, title, body, link } = input;
    console.log(`[sendNotification] Invoked for user ${userId} with title: "${title}"`);
    const { adminDb, adminMessaging } = await getFirebaseAdmin();

    const tokensSnapshot = await adminDb.collection('users').doc(userId).collection('fcmTokens').get();
    
    if (tokensSnapshot.empty) {
        const msg = `[sendNotification] No FCM tokens found for user ${userId}. Cannot send.`;
        console.warn(msg);
        return { success: false, message: msg };
    }
    
    const tokens = tokensSnapshot.docs.map(doc => (doc.data() as FcmToken).token);
    console.log(`[sendNotification] Found ${tokens.length} tokens for user ${userId}.`);

    const message: MulticastMessage = {
        notification: { title, body },
        // Data is cruciaal voor klik-afhandeling in de achtergrond
        data: {
            title: title || '',
            body: body || '',
            link: link || '/',
        },
        android: {
            priority: 'high',
            notification: {
                sound: 'default',
                priority: 'high',
                channelId: 'default', // Zorg dat dit kanaal bestaat op Android
            }
        },
        apns: {
            payload: {
                aps: {
                    alert: { title, body },
                    sound: 'default',
                    badge: 1,
                    'content-available': 1, // Maakt de app wakker
                },
            },
            headers: {
                'apns-priority': '10', // 10 is direct, 5 is energiezuinig
            },
        },
        webpush: {
            headers: {
                Urgency: 'high' // Let op: hoofdletter U
            },
            notification: {
                title,
                body,
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-192x192.png',
                requireInteraction: true, // Houdt de notificatie zichtbaar
            },
            fcmOptions: {
                link: link || '/',
            },
        },
        tokens: tokens,
    };

    console.log('[sendNotification] FCM Payload:', JSON.stringify(message, null, 2));

    try {
      const response = await adminMessaging.sendEachForMulticast(message);
      console.log(`[sendNotification] Successfully sent message to ${response.successCount} of ${tokens.length} tokens.`);

      if (response.failureCount > 0) {
        console.warn(`[sendNotification] Failed to send to ${response.failureCount} tokens.`);
        // Optional: Clean up invalid tokens based on error codes
      }

      return { success: true, message: "Notification sent successfully." };
    } catch (error) {
      console.error('[sendNotification] Error sending message:', error);
      return { success: false, message: "Failed to send notification." };
    }
}
