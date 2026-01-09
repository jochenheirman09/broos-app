
"use client";

import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { useFirebaseApp } from "@/firebase";
import { useUser } from "@/context/user-context";
import { useEffect, useCallback } from "react";
import { saveFcmToken } from "@/actions/user-actions";
import { useToast } from "@/hooks/use-toast";

/**
 * A custom hook to manage Firebase Cloud Messaging permissions and tokens.
 */
export const useRequestNotificationPermission = () => {
    const app = useFirebaseApp();
    const { user } = useUser();
    const { toast } = useToast();

    const requestPermission = useCallback(async (isSilent = true): Promise<NotificationPermission | "unsupported" | undefined> => {
        const logPrefix = `[FCM] User: ${user?.uid || 'anonymous'} |`;
        
        console.log(`${logPrefix} 'requestPermission' initiated. Silent mode: ${isSilent}`);

        if (typeof window === 'undefined') {
            console.log(`${logPrefix} Aborted: Not in a browser environment.`);
            return;
        }
        
        if (!app || !user) {
            if (!isSilent) console.log(`${logPrefix} Request skipped: Firebase App not ready or user not logged in.`);
            return;
        }

        if (!("Notification" in window) || !("serviceWorker" in navigator)) {
            if (!isSilent) console.error(`${logPrefix} Notifications not supported by this browser.`);
            return 'unsupported';
        }
        
        const currentPermission = Notification.permission;
        console.log(`${logPrefix} Current permission state: '${currentPermission}'.`);

        if (currentPermission === 'granted') {
             console.log(`${logPrefix} Permission is already granted. Proceeding to get/refresh token...`);
        } else if (isSilent) {
            console.log(`${logPrefix} Silent check: Permission not granted, so skipping request.`);
            return currentPermission;
        } else {
            console.log(`${logPrefix} Actively requesting notification permission...`);
            const newPermission = await Notification.requestPermission();
            console.log(`${logPrefix} Permission request result: '${newPermission}'.`);
            if (newPermission !== 'granted') {
                console.log(`${logPrefix} Permission to notify was not granted ('${newPermission}').`);
                toast({ variant: 'destructive', title: 'Permissie geweigerd', description: 'Je moet meldingen in je browserinstellingen inschakelen.' });
                return newPermission;
            }
        }
            
        try {
            console.log(`${logPrefix} Fetching VAPID key from API...`);
            const response = await fetch('/api/fcm-vapid-key');
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Failed to fetch VAPID key: ${response.statusText}. Body: ${errorText}`);
            }
            const { vapidKey } = await response.json();

            if (!vapidKey) {
                throw new Error("VAPID key for notifications is missing from server response.");
            }
            console.log(`${logPrefix} Successfully fetched VAPID key: ${vapidKey.substring(0,10)}...`);

            const messaging = getMessaging(app);
            const serviceWorkerRegistration = await navigator.serviceWorker.ready;
            console.log(`${logPrefix} Service worker ready. Requesting token...`);
            const currentToken = await getToken(messaging, { serviceWorkerRegistration, vapidKey });

            if (currentToken) {
                console.log(`${logPrefix} Token retrieved: ${currentToken.substring(0, 20)}...`);
                const result = await saveFcmToken(user.uid, currentToken);
                if (result.success) {
                    console.log(`${logPrefix} SUCCESS: Server action confirmed token was saved/synced.`);
                    if (!isSilent) {
                        toast({ title: "Notificaties ingeschakeld!", description: "Je bent klaar om meldingen te ontvangen." });
                    }
                } else {
                    throw new Error(result.message);
                }
            } else {
                console.warn(`${logPrefix} No registration token available. This usually means permission was just denied.`);
                if (!isSilent) {
                    throw new Error('Kon geen registratietoken genereren. Probeer de pagina te vernieuwen.');
                }
            }
        } catch (err: any) {
            console.error(`${logPrefix} CRITICAL ERROR during token process:`, err);
            if (!isSilent) {
                toast({ variant: 'destructive', title: 'Fout bij instellen notificaties', description: err.message });
            }
        }
        return Notification.permission;
    }, [app, user, toast]);
    
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
                    // Show a notification
                    new Notification(payload.notification?.title || 'New Message', {
                        body: payload.notification?.body,
                        icon: payload.notification?.icon
                    });
                     // Update the app badge
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
