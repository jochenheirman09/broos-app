
'use client';

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebaseApp } from '@/firebase';
import { useUser } from '@/context/user-context';
import { useEffect } from 'react';
import { saveFcmToken } from '@/actions/user-actions';


/**
 * A custom hook to manage Firebase Cloud Messaging permissions and tokens.
 * This version reads the VAPID key from public environment variables.
 */
export const useRequestNotificationPermission = () => {
    const app = useFirebaseApp();
    const { user } = useUser();

    const requestPermission = async (isManualAction = false): Promise<NotificationPermission | 'unsupported' | undefined> => {
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
        
        if (isManualAction && currentPermission === 'default') {
            console.log(`${logPrefix} Actively requesting notification permission...`);
            currentPermission = await Notification.requestPermission();
            console.log(`${logPrefix} Permission request result: '${currentPermission}'.`);
        }
        
        if (currentPermission === 'granted') {
            console.log(`${logPrefix} Permission is granted. Proceeding to get/refresh token...`);
            
            try {
                const response = await fetch('/api/fcm-vapid-key');
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`${logPrefix} Failed to fetch VAPID key. Status: ${response.status}. Body: ${errorText}`);
                    throw new Error(`Failed to fetch VAPID key: ${response.statusText}`);
                }
                const { vapidKey } = await response.json();

                if (!vapidKey) {
                    console.error(`${logPrefix} CRITICAL: VAPID key not available from API. Check server logs for the API route.`);
                    throw new Error("VAPID key for notifications ontbreekt in de applicatieconfiguratie.");
                }
                console.log(`${logPrefix} Successfully fetched VAPID key.`);

                const messaging = getMessaging(app);
                console.log(`${logPrefix} Requesting token from Firebase Messaging...`);
                const serviceWorkerRegistration = await navigator.serviceWorker.ready;
                console.log(`${logPrefix} Service Worker is ready. Using it for token retrieval.`);
                const currentToken = await getToken(messaging, { serviceWorkerRegistration, vapidKey });

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
                    console.warn(`${logPrefix} No registration token available. This may happen if the service worker registration fails.`);
                    throw new Error('Kon geen registratietoken genereren. Controleer de console op service worker-fouten.');
                }
            } catch (err: any) {
                console.error(`${logPrefix} CRITICAL ERROR: An error occurred while retrieving or saving the token.`, err);
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
                    console.log('[Foreground Listener] Message received. ', payload);
                    new Notification(payload.notification?.title || 'New Message', {
                        body: payload.notification?.body,
                        icon: payload.notification?.icon
                    });
                    if ('setAppBadge' in navigator && typeof navigator.setAppBadge === 'function') {
                        console.log('[Foreground Listener] Setting app badge.');
                        navigator.setAppBadge(1).catch(e => console.error('[Foreground Listener] Error setting app badge:', e));
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
