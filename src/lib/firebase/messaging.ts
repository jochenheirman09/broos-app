
'use client';

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebaseApp } from '@/firebase';
import { useUser } from '@/context/user-context';
import { useEffect } from 'react';
import { saveFcmToken } from '@/actions/user-actions';


/**
 * A custom hook to manage Firebase Cloud Messaging permissions and tokens.
 */
export const useRequestNotificationPermission = () => {
    const app = useFirebaseApp();
    const { user } = useUser();

    const requestPermission = async (isManualAction = false): Promise<NotificationPermission | 'unsupported' | 'timeout' | undefined> => {
        const logPrefix = `[FCM] User: ${user?.uid || 'anonymous'} | Manual: ${isManualAction} |`;
        
        if (!app || !user) {
            console.log(`${logPrefix} Request skipped: Firebase App not ready or user not logged in.`);
            return;
        }
        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
            console.log(`${logPrefix} Notifications not supported by this browser.`);
            return 'unsupported';
        }
        
        let currentPermission = Notification.permission;
        console.log(`${logPrefix} Initial permission state: '${currentPermission}'.`);
        
        // Only actively ask for permission if it's a manual action and permission hasn't been granted or denied yet.
        if (isManualAction && currentPermission === 'default') {
            console.log(`${logPrefix} Actively requesting notification permission...`);
            currentPermission = await Notification.requestPermission();
            console.log(`${logPrefix} Permission request result: '${currentPermission}'.`);
        }
        
        if (currentPermission === 'granted') {
            console.log(`${logPrefix} Permission is granted. Proceeding to get/refresh token...`);
            
            // For client-side code, Next.js makes NEXT_PUBLIC_ variables directly available on process.env
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

            if (!vapidKey) {
                console.error(`${logPrefix} CRITICAL: VAPID key is not available.`);
                throw new Error("VAPID key for notifications ontbreekt in de applicatieconfiguratie.");
            } else {
                console.log(`${logPrefix} VAPID key found.`);
            }

            try {
                const messaging = getMessaging(app);
                
                console.log(`${logPrefix} Requesting token from Firebase Messaging...`);
                // Let Firebase handle the service worker registration.
                // It will automatically look for '/firebase-messaging-sw.js'.
                const currentToken = await getToken(messaging, { vapidKey });

                if (currentToken) {
                    console.log(`${logPrefix} Token retrieved successfully: ${currentToken.substring(0, 20)}...`);
                    
                    console.log(`${logPrefix} Calling server action to save token.`);
                    const result = await saveFcmToken(user.uid, currentToken, isManualAction);
                    
                    if (result.success) {
                        console.log(`${logPrefix} SUCCESS: Server action confirmed token was saved.`);
                    } else {
                        console.error(`${logPrefix} FAILED: Server action reported an error: ${result.message}`);
                        throw new Error(result.message);
                    }

                } else {
                    console.warn(`${logPrefix} No registration token available. This may happen if the service worker is not yet active. Please try again.`);
                    throw new Error('Kon geen registratietoken genereren. Probeer de pagina te herladen en probeer het opnieuw.');
                }
            } catch (err: any) {
                console.error(`${logPrefix} CRITICAL ERROR: An error occurred while retrieving or saving the token.`, err.message);
                throw err;
            }
        } else {
            console.log(`${logPrefix} Permission to notify was not granted ('${currentPermission}').`);
        }
        return currentPermission;
    };
    
    return { requestPermission };
};


// A component that listens for foreground messages
export const ForegroundMessageListener = () => {
    const app = useFirebaseApp();
    
    useEffect(() => {
        if (app && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            try {
                const messaging = getMessaging(app);
                const unsubscribe = onMessage(messaging, (payload) => {
                    console.log('Foreground message received. ', payload);
                    new Notification(payload.notification?.title || 'New Message', {
                        body: payload.notification?.body,
                        icon: payload.notification?.icon
                    });
                    if ('setAppBadge' in navigator && typeof navigator.setAppBadge === 'function') {
                        console.log('[Foreground Listener] Setting app badge.');
                        navigator.setAppBadge(1);
                    }
                });

                return () => unsubscribe();
            } catch (error) {
                console.warn('Firebase Messaging not available in this environment:', error);
            }
        }
    }, [app]);
    
    return null; // This component does not render anything
}
