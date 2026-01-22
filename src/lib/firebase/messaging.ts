"use client";

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { useFirebaseApp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { type User } from "firebase/auth";
import { useCallback, useEffect } from 'react';

/**
 * A flexible hook for handling notification permissions and token synchronization.
 * It can be triggered manually by a user action or silently in the background.
 */
export const useRequestNotificationPermission = () => {
    const app = useFirebaseApp();
    const { toast } = useToast();

    /**
     * @param user The authenticated Firebase user.
     * @param isManualTrigger True if triggered by a direct user action (e.g., a button click).
     * This controls whether UI feedback like toasts is shown.
     */
    const requestPermission = useCallback(async (user: User | null, isManualTrigger: boolean = false): Promise<boolean> => {
        const logPrefix = `[FCM] User: ${user?.uid} | Manual: ${isManualTrigger} |`;
        
        if (!user || !app || !("Notification" in window) || !("serviceWorker" in navigator)) {
            if (isManualTrigger) {
                toast({ variant: 'destructive', title: 'Fout', description: 'Browser ondersteunt geen meldingen of je bent niet ingelogd.' });
            }
            console.log(`${logPrefix} Skipping: Browser/env does not support notifications or user not logged in.`);
            return false;
        }
        
        try {
            let currentPermission = Notification.permission;
            console.log(`${logPrefix} ℹ️ Current permission state: '${currentPermission}'.`);

            if (currentPermission === 'denied') {
                console.warn(`${logPrefix} Permission explicitly denied in browser settings. Aborting sync.`);
                if (isManualTrigger) {
                    toast({
                        variant: "destructive",
                        title: "Toestemming Geblokkeerd",
                        description: "Je hebt meldingen geblokkeerd in je browser. Pas dit aan in je browser-instellingen om meldingen in te schakelen.",
                    });
                }
                return false;
            }

            if (isManualTrigger && currentPermission === 'default') {
                console.log(`${logPrefix} Requesting browser permission...`);
                currentPermission = await Notification.requestPermission();
            }

            if (currentPermission !== 'granted') {
                console.warn(`${logPrefix} Permission not granted, was '${currentPermission}'.`);
                if (isManualTrigger) {
                    toast({ title: "Toestemming niet verleend", description: "Je ontvangt geen meldingen." });
                }
                return false;
            }

            console.log(`${logPrefix} ✅ Permission granted. Registering SW...`);
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' });
            console.log(`${logPrefix} ✅ SW Registered, scope: ${registration.scope}. Calling getToken().`);

            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) throw new Error("VAPID key ontbreekt in de configuratie.");

            const messaging = getMessaging(app);
            const currentToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });

            if (!currentToken) throw new Error("Kon geen FCM-token genereren. De Service Worker is mogelijk niet actief.");
            
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
            if (isManualTrigger) {
                toast({ title: "Meldingen Succesvol Gesynchroniseerd!" });
            }
            return true;

        } catch (err: any) {
            console.error(`${logPrefix} 🔥 ERROR:`, err);
            if (isManualTrigger) {
                toast({ variant: "destructive", title: "Fout bij Synchroniseren", description: err.message });
            }
            return false;
        }
    }, [app, toast]);

    return { requestPermission };
};


// A component that listens for foreground messages
export const ForegroundMessageListener = () => {
    const app = useFirebaseApp();
    const { toast } = useToast();

    useEffect(() => {
        if (app && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
                const messaging = getMessaging(app);
                const unsubscribe = onMessage(messaging, (payload) => {
                    console.log('[FCM] Foreground message received. ', payload);
                    
                    toast({
                        title: payload.data?.title || "Nieuw Bericht",
                        description: payload.data?.body,
                    });
                });

                return () => unsubscribe();
            } catch (error) {
                console.warn('[FCM] Could not set up foreground message listener:', error);
            }
        }
    }, [app, toast]);
    
    return null; // This component does not render anything
};
