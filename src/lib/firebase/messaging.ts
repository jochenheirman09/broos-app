
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
 */
export const useRequestNotificationPermission = () => {
    const app = useFirebaseApp();
    const { user } = useUser();
    const db = getFirestore();

    const requestPermission = async (silentRefreshOnly = false) => {
        if (!app) {
            console.log("[FCM] Silent refresh skipped: Firebase App not available yet.");
            return;
        }
        if (!user) {
            console.log("[FCM] Silent refresh skipped: User not logged in.");
            return;
        }
        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
            console.log("[FCM] Notifications not supported by this browser.");
            return;
        }
        
        let currentPermission = Notification.permission;
        console.log(`[FCM] Current notification permission state is: ${currentPermission}`);
        
        if (silentRefreshOnly && currentPermission !== 'granted') {
             console.log('[FCM] Silent refresh skipped: permission is not "granted".');
             return;
        }

        if (!silentRefreshOnly) {
            console.log('[FCM] Actively requesting notification permission...');
            currentPermission = await Notification.requestPermission();
            console.log(`[FCM] Permission request result: ${currentPermission}`);
        }
        
        if (currentPermission === 'granted') {
            console.log('[FCM] Permission is granted. Proceeding to get/refresh token...');
            
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                console.error("[FCM] CRITICAL: VAPID key is not available. Make sure NEXT_PUBLIC_FIREBASE_VAPID_KEY is set in your .env.local file.");
                return;
            }
            console.log('[FCM] VAPID key found.');

            try {
                const messaging = getMessaging(app);
                const currentToken = await getToken(messaging, { vapidKey });

                if (currentToken) {
                    console.log('[FCM] Token retrieved successfully:', currentToken);
                    const tokenRef = doc(db, 'users', user.uid, 'fcmTokens', currentToken);
                    
                    console.log(`[FCM] Preparing to save token to Firestore at path: ${tokenRef.path}`);
                    await setDoc(tokenRef, {
                        token: currentToken,
                        lastUpdated: serverTimestamp(),
                        platform: 'web',
                    }, { merge: true });
                    console.log('[FCM] SUCCESS: Token saved to Firestore subcollection.');
                } else {
                    console.warn('[FCM] No registration token available. This can happen if the service worker is not correctly registered or if permission was just granted and the page needs a refresh.');
                }
            } catch (err) {
                console.error('[FCM] CRITICAL ERROR: An error occurred while retrieving or saving the token.', err);
            }
        } else {
            console.log('[FCM] Permission to notify was not granted.');
        }
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
                        icon: payload.notification?.icon,
                        data: payload.data
                    });
                });

                return () => unsubscribe();
            } catch (error) {
                console.warn('Firebase Messaging not available in this environment:', error);
            }
        }
    }, [app]);
    
    return null; // This component does not render anything
}
