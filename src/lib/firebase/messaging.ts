
'use client';

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebaseApp } from '@/firebase';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useUser } from '@/context/user-context';
import { useEffect } from 'react';


// This function can be called from a client component.
export const useRequestNotificationPermission = () => {
    const app = useFirebaseApp();
    const { user } = useUser();
    const db = getFirestore();

    const requestPermission = async () => {
        if (!app || !user || !("Notification" in window)) {
            console.log("Notifications not supported or user not logged in.");
            return;
        }
        
        console.log('Requesting permission...');
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            console.log('Notification permission granted.');
            
            // For client-side code, Next.js makes NEXT_PUBLIC_ variables directly available on process.env
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

            if (!vapidKey) {
                console.error("VAPID key not available. Make sure NEXT_PUBLIC_FIREBASE_VAPID_KEY is set in your .env file.");
                return;
            }

            try {
                const messaging = getMessaging(app);
                const currentToken = await getToken(messaging, { vapidKey });

                if (currentToken) {
                    console.log('FCM Token:', currentToken);
                    // Save the token to Firestore
                    const tokenRef = doc(db, 'users', user.uid, 'fcmTokens', currentToken);
                    await setDoc(tokenRef, {
                        token: currentToken,
                        createdAt: serverTimestamp()
                    }, { merge: true });
                } else {
                    console.log('No registration token available. Request permission to generate one.');
                }
            } catch (err) {
                console.error('An error occurred while retrieving token. ', err);
            }
        } else {
            console.log('Unable to get permission to notify.');
        }
    };
    
    return { requestPermission };
};


// A component that listens for foreground messages
export const ForegroundMessageListener = () => {
    const app = useFirebaseApp();
    
    useEffect(() => {
        if (app && typeof window !== 'undefined') {
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
        }
    }, [app]);
    
    return null; // This component does not render anything
}
