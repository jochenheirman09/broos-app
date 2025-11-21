
'use client';

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebaseApp } from '@/firebase/client-provider';
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
            return;
        }
        
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            
            // IMPORTANT: Replace the placeholder below with your actual VAPID key from the Firebase console.
            // This is a public key, so it's safe to have in client-side code.
            const vapidKey = "BL921KtlXxkQTzzC4WqKljW4tDBR-2bOC2U828WlzXGWdGAz24u_ZkrtDEnhgLwJw-rIpe-nhK4naJPbt-CoPLo";

            if (vapidKey === "BL921KtlXxkQTzzC4WqKljW4tDBR-2bOC2U828WlzXGWdGAz24u_ZkrtDEnhgLwJw-rIpe-nhK4naJPbt-CoPLo") {
                console.error("VAPID key is not configured. Please add it to src/lib/firebase/messaging.ts");
                return;
            }

            try {
                const messaging = getMessaging(app);
                const currentToken = await getToken(messaging, { vapidKey });

                if (currentToken) {
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
        if (app && typeof window !== 'undefined' && "Notification" in window && Notification.permission === 'granted') {
            const messaging = getMessaging(app);
            const unsubscribe = onMessage(messaging, (payload) => {
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
