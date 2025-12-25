
'use client';

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebaseApp } from '@/firebase';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useUser } from '@/context/user-context';
import { useEffect } from 'react';


/**
 * A custom hook to manage Firebase Cloud Messaging permissions and tokens.
 * It can be used to either actively prompt the user for permission or to
 * silently refresh the token if permission is already granted.
 * @returns An object with a `requestPermission` function.
 */
export const useRequestNotificationPermission = () => {
    const app = useFirebaseApp();
    const { user } = useUser();
    const db = getFirestore();

    const requestPermission = async (silentRefreshOnly = false): Promise<NotificationPermission | undefined> => {
        if (!app || !user) {
            console.log("[FCM] Request skipped: Firebase App not ready or user not logged in.");
            return;
        }
        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
            console.log("[FCM] Notifications not supported by this browser.");
            return 'denied';
        }
        
        let currentPermission = Notification.permission;
        
        if (silentRefreshOnly && currentPermission !== 'granted') {
             console.log('[FCM] Silent refresh skipped: permission is not "granted".');
             return currentPermission;
        }

        if (!silentRefreshOnly && currentPermission === 'default') {
            console.log('[FCM] Actively requesting notification permission...');
            currentPermission = await Notification.requestPermission();
            console.log(`[FCM] Permission request result: ${currentPermission}`);
        }
        
        if (currentPermission === 'granted') {
            console.log('[FCM] Permission is granted. Proceeding to get/refresh token...');
            
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                console.error("[FCM] CRITICAL: VAPID key is not available. Make sure NEXT_PUBLIC_FIREBASE_VAPID_KEY is set.");
                return currentPermission;
            }

            try {
                const messaging = getMessaging(app);
                const currentToken = await getToken(messaging, { vapidKey });

                if (currentToken) {
                    console.log('[FCM] Token retrieved successfully:', currentToken);
                    const tokenRef = doc(db, 'users', user.uid, 'fcmTokens', currentToken);
                    
                    await setDoc(tokenRef, {
                        token: currentToken,
                        lastUpdated: serverTimestamp(),
                        platform: 'web',
                    }, { merge: true });
                    console.log('[FCM] SUCCESS: Token saved to Firestore subcollection.');
                } else {
                    console.warn('[FCM] No registration token available. This can happen if the service worker is not active.');
                }
            } catch (err) {
                console.error('[FCM] CRITICAL ERROR: An error occurred while retrieving or saving the token.', err);
            }
        } else {
            console.log('[FCM] Permission to notify was not granted.');
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
                        icon: payload.notification?.icon,
                        data: payload.data
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
