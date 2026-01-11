
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
        if (!isSilent) console.log(`${logPrefix} 'requestPermission' initiated. Silent mode: ${isSilent}`);

        if (typeof window === 'undefined' || !("Notification" in window) || !("serviceWorker" in navigator)) {
            if (!isSilent) console.warn(`${logPrefix} Notifications not supported in this environment.`);
            return 'denied';
        }

        if (!app || !userId) {
            if (!isSilent) console.error(`${logPrefix} Request skipped: Firebase App not ready or user not logged in.`);
            return;
        }

        // 1. Check Current Permission
        const currentPermission = Notification.permission;
        if (!isSilent) console.log(`${logPrefix} Current permission state: '${currentPermission}'.`);
        if (currentPermission === 'denied' && !isSilent) {
             toast({ variant: 'destructive', title: 'Permissie Geblokkeerd', description: 'Je moet meldingen in je browserinstellingen inschakelen.' });
             return 'denied';
        }

        // 2. Request Permission if needed
        let finalPermission = currentPermission;
        if (currentPermission === 'default') {
             finalPermission = await Notification.requestPermission();
             if (!isSilent) console.log(`${logPrefix} Browser permission dialog result: '${finalPermission}'.`);
             if (finalPermission !== 'granted') {
                 if (!isSilent) toast({ variant: 'destructive', title: 'Permissie Geweigerd' });
                 return finalPermission;
             }
        }
        
        // This check is now separate. If permission is granted (either now or previously), we proceed.
        if (finalPermission !== 'granted') {
          return finalPermission;
        }

        // 3. Get VAPID Key
        const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
        console.log(`%c[FCM] 🔑 VAPID KEY CHECK: ${vapidKey ? "Aanwezig" : "ONTBREEKT (Undefined)"}`, `color: ${vapidKey ? 'green' : 'red'}; font-weight: bold;`);
        if (!vapidKey) {
            console.error(`%c${logPrefix} CRITICAL: VAPID key not found. Ensure NEXT_PUBLIC_FIREBASE_VAPID_KEY is set.`, 'color: red; font-weight: bold;');
            if (!isSilent) toast({ variant: 'destructive', title: 'Configuratiefout', description: 'Client configuration for notifications is missing.' });
            return;
        }
        
        // 4. Get Token and Save
        try {
            const messaging = getMessaging(app);
            if (!isSilent) console.log(`${logPrefix} Waiting for Service Worker to be ready...`);
            const serviceWorkerRegistration = await navigator.serviceWorker.ready;
            if (!isSilent) console.log(`${logPrefix} Service Worker is ready. Attempting to get token...`);

            const currentToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration });

            if (currentToken) {
                if (!isSilent) console.log(`${logPrefix} Token generated: ${currentToken.substring(0, 20)}...`);
                // Call the server action to save the token
                await saveFcmToken(userId, currentToken);
                if (!isSilent) toast({ title: "Notificaties Ingeschakeld!", description: "Je bent klaar om meldingen te ontvangen." });
            } else {
                throw new Error("Kon geen notificatie-token genereren. Probeer de pagina te vernieuwen.");
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
                    
                    // Construct and show the notification manually
                    const notification = new Notification(payload.notification?.title || 'Nieuw Bericht', {
                        body: payload.notification?.body,
                        icon: payload.notification?.icon,
                        data: payload.data // Pass along the data payload
                    });

                    // Handle notification click
                    notification.onclick = (event) => {
                        event.preventDefault(); // Prevent the browser from focusing the Notification's tab
                        const link = payload.data?.link || '/';
                        window.open(link, '_blank');
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
