
'use server';
import { getFirebaseAdmin } from '../genkit';
import type { FcmToken } from '../../lib/types';
import type { MulticastMessage } from 'firebase-admin/messaging';
import { type NotificationInput } from '../types';


export async function sendNotification(
  input: NotificationInput
): Promise<{ success: boolean; message: string }> {
    const { userId, title, body, link, id } = input;
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
        // Re-added for higher delivery priority, especially on iOS.
        notification: {
            title: title,
            body: body,
        },
        data: {
            title: title || '',
            body: body || '',
            link: link || '/',
        },
        android: {
            priority: 'high',
        },
        apns: {
            payload: {
                aps: {
                    'content-available': 1,
                    sound: 'default',
                    badge: 1,
                },
            },
            headers: {
                'apns-priority': '10',
            },
        },
        webpush: {
            notification: {
                title: title,
                body: body,
                icon: '/icons/icon-192x192.png',
                tag: id, // Use unique ID to prevent duplicates for the same event
                renotify: true,
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
      console.log(`[sendNotification] ✅ Successfully sent message to ${response.successCount} of ${tokens.length} tokens.`);

      if (response.failureCount > 0) {
        console.warn(`[sendNotification] Failed to send to ${response.failureCount} tokens.`);
        const tokensToDelete: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            // These error codes indicate that the token is no longer valid.
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              const badToken = tokens[idx];
              tokensToDelete.push(badToken);
              console.log(`[sendNotification] Scheduling token for deletion: ${badToken}`);
            }
          }
        });

        if (tokensToDelete.length > 0) {
            // Asynchronously delete the invalid tokens from Firestore.
            const batch = adminDb.batch();
            tokensToDelete.forEach(token => {
                const tokenRef = adminDb.collection('users').doc(userId).collection('fcmTokens').doc(token);
                batch.delete(tokenRef);
            });
            await batch.commit();
            console.log(`[sendNotification] Deleted ${tokensToDelete.length} invalid tokens from Firestore.`);
        }
      }

      return { success: true, message: "Notification sent successfully." };
    } catch (error) {
      console.error('[sendNotification] Error sending message:', error);
      return { success: false, message: "Failed to send notification." };
    }
}
