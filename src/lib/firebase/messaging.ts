
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
        if (!app || !user || !("Notification" in window)) {
            console.log("Notifications not supported or user not logged in.");
            return;
        }
        
        let currentPermission = Notification.permission;
        
        // If we only want to refresh silently, and permission is not 'granted', do nothing.
        if (silentRefreshOnly && currentPermission !== 'granted') {
             console.log('[FCM] Silent refresh skipped: permission not granted.');
             return;
        }

        if (!silentRefreshOnly) {
            console.log('[FCM] Requesting notification permission...');
            currentPermission = await Notification.requestPermission();
        }
        
        if (currentPermission === 'granted') {
            console.log('[FCM] Notification permission is granted. Getting/refreshing token...');
            
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                console.error("[FCM] VAPID key not available. Make sure NEXT_PUBLIC_FIREBASE_VAPID_KEY is set.");
                return;
            }

            try {
                const messaging = getMessaging(app);
                const currentToken = await getToken(messaging, { vapidKey });

                if (currentToken) {
                    console.log('[FCM] Token retrieved successfully:', currentToken);
                    const tokenRef = doc(db, 'users', user.uid, 'fcmTokens', currentToken);
                    // Use set with merge to create or update the timestamp.
                    await setDoc(tokenRef, {
                        token: currentToken,
                        lastUpdated: serverTimestamp(),
                        platform: 'web',
                    }, { merge: true });
                    console.log('[FCM] Token saved to Firestore subcollection.');
                } else {
                    console.log('[FCM] No registration token available. Request permission to generate one.');
                }
            } catch (err) {
                console.error('[FCM] An error occurred while retrieving or saving token.', err);
            }
        } else {
            console.log('[FCM] Unable to get permission to notify.');
        }
    };
    
    return { requestPermission };
};


// A component that listens for foreground messages
export const ForegroundMessageListener = () => {
    const app = useFirebaseApp();
    
    useEffect(() => {
        if (app && typeof window !== 'undefined') {
            try {
                const messaging = getMessaging(app);
                const unsubscribe = onMessage(messaging, (payload) => {
                    console.log('Message received. ', payload);
                    // You can show a custom in-app notification here
                    // For now, we'll just log it.
                    new Notification(payload.notification?.title || 'New Message', {
                        body: payload.notification?.body,
                        icon: payload.notification?.icon
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
