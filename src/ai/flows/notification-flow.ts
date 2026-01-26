'use server';
import { getFirebaseAdmin } from '../genkit';
import type { FcmToken } from '../../lib/types';
import type { MulticastMessage } from 'firebase-admin/messaging';
import { type NotificationInput } from '../types';

export async function sendNotification(
  input: NotificationInput
): Promise<{ success: boolean; message: string }> {
    const { userId, title, body, link, id } = input;
    const logPrefix = `[sendNotification] User: ${userId} |`;
    console.log(`${logPrefix} Invoked with title: "${title}"`);
    
    const { adminDb, adminMessaging } = await getFirebaseAdmin();

    const tokensSnapshot = await adminDb.collection('users').doc(userId).collection('fcmTokens').get();
    
    if (tokensSnapshot.empty) {
        const msg = `${logPrefix} No FCM tokens found. Cannot send.`;
        console.warn(msg);
        return { success: false, message: msg };
    }
    
    const tokens = tokensSnapshot.docs.map(doc => doc.id); // The document ID is the token itself
    console.log(`${logPrefix} Found ${tokens.length} tokens.`);

    const tag = id || `broos-message-${Date.now()}`;

    // --- HYBRID PAYLOAD (DEFINITIVE FIX) ---
    const message: MulticastMessage = {
        // 1. FOR RELIABLE DELIVERY (especially on killed Android apps)
        notification: {
            title: title || 'Nieuw bericht',
            body: body || 'Je hebt een nieuw bericht.',
        },
        // 2. FOR SERVICE WORKER LOGIC (click action, etc.)
        data: {
            title: title || 'Nieuw bericht',
            body: body || 'Je hebt een nieuw bericht.',
            link: link || '/',
            tag: tag,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png', // Corrected icon path
        },
        // 3. PLATFORM-SPECIFIC CONFIGS
        android: { 
            priority: 'high',
        },
        apns: {
            payload: { aps: { 'content-available': 1, sound: 'default', badge: 1 } },
            headers: { 'apns-priority': '10' },
        },
        webpush: {
            headers: { Urgency: "high" },
            // Add notification details here for webpush standards
            notification: {
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-192x192.png',
                tag: tag,
                renotify: true,
            },
            // fcmOptions is critical for click_action on web
            fcmOptions: {
                link: link || '/',
            },
        },
        tokens: tokens,
    };
    
    // Corrected log message to be unambiguous
    console.log(`${logPrefix} 📲 Sending HYBRID FCM Payload:`, JSON.stringify(message, null, 2));

    try {
      const response = await adminMessaging.sendEachForMulticast(message);
      console.log(`${logPrefix} ✅ Successfully sent message to ${response.successCount} of ${tokens.length} tokens.`);

      if (response.failureCount > 0) {
        console.warn(`${logPrefix} Failed to send to ${response.failureCount} tokens.`);
        const tokensToDelete: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (
              errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered'
            ) {
              const badToken = tokens[idx];
              tokensToDelete.push(badToken);
              console.log(`${logPrefix} Scheduling token for deletion: ${badToken}`);
            }
          }
        });

        if (tokensToDelete.length > 0) {
            const batch = adminDb.batch();
            tokensToDelete.forEach(token => {
                const tokenRef = adminDb.collection('users').doc(userId).collection('fcmTokens').doc(token);
                batch.delete(tokenRef);
            });
            await batch.commit();
            console.log(`${logPrefix} Deleted ${tokensToDelete.length} invalid tokens from Firestore.`);
        }
      }

      return { success: true, message: "Notification sent successfully." };
    } catch (error) {
      console.error(`${logPrefix} Error sending message:`, error);
      return { success: false, message: "Failed to send notification." };
    }
}
