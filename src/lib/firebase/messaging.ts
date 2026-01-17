
"use client";

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebaseApp } from '@/firebase';
import { useCallback, useEffect } from 'react';
import { saveFcmToken } from '@/actions/user-actions';
import { useToast } from '@/hooks/use-toast';

/**
 * A robust, reusable hook for handling FCM notification permission and token management.
 * @returns An object containing the `requestPermission` function.
 */
export const useRequestNotificationPermission = () => {
    const app = useFirebaseApp();
    const { toast } = useToast();

    /**
     * Handles the entire flow of requesting permission and syncing the token.
     * @param userId - The UID of the user to associate the token with.
     * @param isSilent - If true, logs less and won't show success toasts.
     * @returns The permission status granted by the user.
     */
    const requestPermission = useCallback(async (userId: string, isSilent: boolean = false): Promise<NotificationPermission | undefined> => {
        const logPrefix = `[FCM] User: ${userId} |`;
        console.log(`${logPrefix} 'requestPermission' initiated. Silent mode: ${isSilent}`);

        if (typeof window === 'undefined' || !("Notification" in window) || !("serviceWorker" in navigator)) {
            console.warn(`${logPrefix} Notifications not supported in this environment.`);
            return 'denied';
        }

        if (!app || !userId) {
            console.error(`${logPrefix} Request skipped: Firebase App not ready or user not logged in.`);
            return;
        }

        // 1. Check Current Permission
        const currentPermission = Notification.permission;
        console.log(`${logPrefix} Current permission state: '${currentPermission}'.`);
        if (currentPermission === 'denied') {
             if (!isSilent) toast({ variant: 'destructive', title: 'Permissie Geblokkeerd', description: 'Je moet meldingen in je browserinstellingen inschakelen.' });
             return 'denied';
        }

        // 2. Request Permission if needed
        let finalPermission = currentPermission;
        if (currentPermission === 'default') {
             if (isSilent) {
                console.log(`${logPrefix} Permission is 'default'. Skipping silent request.`);
                return 'default';
             }
             console.log(`${logPrefix} Requesting browser permission...`);
             finalPermission = await Notification.requestPermission();
             console.log(`${logPrefix} Browser permission dialog result: '${finalPermission}'.`);
             if (finalPermission !== 'granted') {
                 if (!isSilent) toast({ variant: 'destructive', title: 'Permissie Geweigerd' });
                 return finalPermission;
             }
        }
        
        if (finalPermission !== 'granted') {
          console.log(`${logPrefix} Final permission is not 'granted'. Aborting.`);
          return finalPermission;
        }

        // 3. Get VAPID Key
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
            console.error(`%c${logPrefix} CRITICAL: VAPID key not found. Ensure NEXT_PUBLIC_FIREBASE_VAPID_KEY is set.`, 'color: red; font-weight: bold;');
            if (!isSilent) toast({ variant: 'destructive', title: 'Configuratiefout', description: 'Client configuration for notifications is missing.' });
            return;
        }
        
        // 4. Get Token and Save
        try {
            console.log(`${logPrefix} Permission granted. Proceeding to get token...`);
            const messaging = getMessaging(app);
            const serviceWorkerRegistration = await navigator.serviceWorker.ready;
            
            if (!serviceWorkerRegistration.active) {
                console.warn(`${logPrefix} Service Worker is ready but not active yet. Aborting token retrieval.`);
                return;
            }
            console.log(`${logPrefix} Service Worker is active. Calling getToken().`);
            
            const currentToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration });

            if (currentToken) {
                console.log(`${logPrefix} Token received: ${currentToken.substring(0, 20)}...`);
                await saveFcmToken(userId, currentToken);
                if (!isSilent) toast({ title: "Notificaties Ingeschakeld!", description: "Je bent klaar om meldingen te ontvangen." });
            } else {
                // This is a common issue, especially on mobile, if the SW isn't fully ready.
                throw new Error("Kon geen notificatie-token genereren. De Service Worker is mogelijk nog niet volledig actief. Probeer de pagina te vernieuwen.");
            }
        } catch (err: any) {
            console.error(`%c${logPrefix} 🔥 ERROR during token flow:`, 'color: red; font-weight: bold;', err);
            if (!isSilent) toast({ variant: 'destructive', title: 'Fout bij Inschakelen', description: err.message });
        }
        
        return finalPermission;

    }, [app, toast]);

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
