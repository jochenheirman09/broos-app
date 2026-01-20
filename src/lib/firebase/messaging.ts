"use client";

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebaseApp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { type User } from "firebase/auth";
import { useCallback, useEffect } from 'react';

/**
 * Hook providing a function to request notification permission and sync the token.
 * This is intended to be called by a user gesture (e.g., a button click).
 */
export const useRequestNotificationPermission = () => {
    const app = useFirebaseApp();
    const { toast } = useToast();

    const requestPermission = useCallback(async (user: User | null): Promise<boolean> => {
        const logPrefix = `[FCM Request] User: ${user?.uid} |`;
        console.log(`${logPrefix} Manual permission request initiated.`);

        if (!user || !app || !("Notification" in window) || !("serviceWorker" in navigator)) {
            toast({ variant: 'destructive', title: 'Fout', description: 'Browser ondersteunt geen meldingen of je bent niet ingelogd.' });
            return false;
        }

        try {
            console.log(`${logPrefix} Requesting browser permission...`);
            const permission = await Notification.requestPermission();
            
            if (permission !== 'granted') {
                console.warn(`${logPrefix} Permission not granted, was '${permission}'.`);
                toast({ variant: "destructive", title: "Toestemming geweigerd", description: "Je hebt geen toestemming gegeven voor meldingen." });
                return false;
            }

            console.log(`${logPrefix} ✅ Permission granted. Proceeding to get token...`);
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) throw new Error("VAPID key ontbreekt in de configuratie.");

            const messaging = getMessaging(app);
            
            console.log(`${logPrefix} ⏳ Registering service worker...`);
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            console.log(`${logPrefix} ✅ Service Worker registered, scope: ${registration.scope}. Calling getToken().`);
            const currentToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });

            if (!currentToken) throw new Error("Kon geen FCM-token genereren.");
            
            console.log(`${logPrefix} ✅ Token received: ${currentToken.substring(0,20)}...`);
            console.log(`${logPrefix} 📲 Sending token to server via API route...`);
            const response = await fetch('/api/save-fcm-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid, token: currentToken })
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'API-fout bij opslaan van token.');
            }
            
            console.log(`${logPrefix} ✅ Server API '/api/save-fcm-token' called successfully.`);
            toast({ title: "Meldingen Ingeschakeld!" });
            return true;

        } catch (err: any) {
            console.error(`${logPrefix} 🔥 ERROR:`, err);
            toast({ variant: "destructive", title: "Fout bij inschakelen", description: err.message });
            return false;
        }
    }, [app, toast]);

    return { requestPermission };
};


/**
 * Handles silent, automatic synchronization of the FCM token on app load/focus
 * and listens for foreground messages.
 * @param app The Firebase App instance.
 * @param user The authenticated Firebase user.
 * @returns An empty unsubscribe function for API consistency.
 */
export const silentSyncAndListen = (app: any, user: User | null) => {
    if (!user || !app || !("Notification" in window) || !("serviceWorker" in navigator)) {
        return () => {}; // Return an empty unsubscribe function
    }

    const logPrefix = `[Auto-Sync] User: ${user.uid} |`;
    const messaging = getMessaging(app);

    const syncToken = async () => {
        if (Notification.permission !== 'granted') {
            console.log(`${logPrefix} Skipping auto-sync: Permission not 'granted'.`);
            return;
        }
        try {
            console.log(`${logPrefix} Permission is granted. Attempting silent token sync.`);
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) throw new Error("VAPID key not found for silent sync.");
            
            const registration = await navigator.serviceWorker.ready;
            const currentToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
            
            if (currentToken) {
                console.log(`${logPrefix} ✅ Token found silently, sending to server.`);
                await fetch('/api/save-fcm-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.uid, token: currentToken })
                });
            } else {
                 console.warn(`${logPrefix} 🤷‍♂️ Permission granted, but no token found silently.`);
            }
        } catch (err: any) {
            console.error(`${logPrefix} 🔥 Silent sync failed:`, err.message);
        }
    };
    
    // Set up listeners for app visibility
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          console.log(`${logPrefix} App became visible. Triggering sync.`);
          syncToken();
        }
    };
    
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', syncToken); // Additional trigger for reliability

    // Initial sync on load
    syncToken();
    
    // Return a cleanup function
    return () => {
        window.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', syncToken);
    };
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
