
'use client';

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebaseApp } from '@/firebase';
import { useUser } from '@/context/user-context';
import { useEffect } from 'react';
import { saveFcmToken } from '@/actions/user-actions';


/**
 * A custom hook to manage Firebase Cloud Messaging permissions and tokens.
 * It can be used to actively prompt the user for permission or to
 * silently refresh the token if permission is already granted.
 * @returns An object with a `requestPermission` function.
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
        
        // Only ask for permission if it's a manual action and permission is currently 'default'.
        if (isManualAction && currentPermission === 'default') {
            console.log(`${logPrefix} Actively requesting notification permission...`);
            currentPermission = await Notification.requestPermission();
            console.log(`${logPrefix} Permission request result: '${currentPermission}'.`);
        }
        
        if (currentPermission === 'granted') {
            console.log(`${logPrefix} Permission is granted. Proceeding to get/refresh token...`);
            
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                console.error(`${logPrefix} CRITICAL: VAPID key is not available.`);
                throw new Error("VAPID key for notifications ontbreekt in de applicatieconfiguratie.");
            }

            try {
                console.log(`${logPrefix} Waiting for service worker to be ready...`);
                // Race a timeout against the service worker readiness.
                const swRegistration = await Promise.race([
                    navigator.serviceWorker.ready,
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Service worker not ready after 5 seconds.')), 5000))
                ]) as ServiceWorkerRegistration;
                console.log(`${logPrefix} Service worker is ready.`);

                const messaging = getMessaging(app);
                
                console.log(`${logPrefix} Requesting token from Firebase Messaging...`);
                const currentToken = await getToken(messaging, { 
                    vapidKey,
                    serviceWorkerRegistration: swRegistration
                });

                if (currentToken) {
                    console.log(`${logPrefix} Token retrieved successfully: ${currentToken.substring(0, 10)}...`);
                    
                    // Call the secure server action to save the token
                    console.log(`${logPrefix} Calling server action to save token.`);
                    const result = await saveFcmToken(user.uid, currentToken, isManualAction);
                    
                    if (result.success) {
                        console.log(`${logPrefix} SUCCESS: Server action confirmed token was saved.`);
                    } else {
                        // Throw error if the server action failed, so the UI can catch it.
                        throw new Error(result.message);
                    }

                } else {
                    console.warn(`${logPrefix} No registration token available. This can happen if the service worker is not active or registration fails.`);
                    throw new Error('Kon geen registratietoken genereren. Probeer de pagina te herladen.');
                }
            } catch (err: any) {
                console.error(`${logPrefix} CRITICAL ERROR: An error occurred while retrieving or saving the token.`, err);
                if (err.message.includes('timeout')) {
                    // Propagate a specific 'timeout' status.
                    return 'timeout';
                }
                // Re-throw other errors to be handled by the caller
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
                    // You can show a custom in-app notification here
                    // For now, we'll just log it.
                    new Notification(payload.notification?.title || 'New Message', {
                        body: payload.notification?.body,
                        icon: payload.notification?.icon
                    });
                     // Update the app badge if the API is available
                    if ('setAppBadge' in navigator && typeof navigator.setAppBadge === 'function') {
                        // Here you might want to fetch the real unread count
                        // For simplicity, we just increment or set to 1
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
