
"use client";

import { getMessaging, onMessage } from 'firebase/messaging';
import { useFirebaseApp } from '@/firebase';
import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { type User } from "firebase/auth";


// This hook is now empty. The logic has been moved directly into the component.
export const useRequestNotificationPermission = () => {
    // This function is now a no-op, its logic lives in the button component for debugging.
    const requestPermission = async (user: User | null, isSilent: boolean = false) => {
        console.warn("[FCM] `useRequestNotificationPermission` is deprecated and has been moved to the button component for debugging.");
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
                    console.log('[FCM] Foreground message received. ', payload);
                    
                    const notification = new Notification(payload.notification?.title || 'New Message', {
                        body: payload.notification?.body,
                        icon: payload.notification?.icon,
                        data: payload.data
                    });

                    notification.onclick = (event) => {
                        event.preventDefault();
                        const link = payload.data?.link || '/';
                        window.open(link, '_self');
                        notification.close();
                    }
                });

                return () => unsubscribe();
            } catch (error) {
                console.warn('[FCM] Messaging not available in this environment:', error);
            }
        }
    }, [app]);
    
    return null; // This component does not render anything
}
