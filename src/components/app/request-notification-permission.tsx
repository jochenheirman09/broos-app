
"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BellRing, Check } from "lucide-react";
import { Spinner } from "../ui/spinner";
import { useUser } from "@/context/user-context";
import { getMessaging, getToken } from "firebase/messaging";
import { useFirebaseApp } from "@/firebase";

export function RequestNotificationPermission() {
    const { user } = useUser();
    const app = useFirebaseApp();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | "unsupported">(
        () => (typeof window !== "undefined" && "Notification" in window) ? Notification.permission : "unsupported"
    );

    const handleRequestPermission = async () => {
        const logPrefix = `[Manual-Request-Button] User: ${user?.uid} |`;
        console.log(`${logPrefix} Button clicked.`);
        alert("Knop geklikt! Start permissie-aanvraag...");

        if (!user || !app) {
            console.error(`${logPrefix} Aborting: User or Firebase App not available.`);
            alert("Fout: Gebruiker of app niet beschikbaar.");
            return;
        }
        
        setIsLoading(true);
        
        try {
            console.log(`${logPrefix} Requesting browser permission...`);
            alert("Vragen om browser permissie...");
            const permission = await Notification.requestPermission();
            setPermissionStatus(permission);
            
            if (permission !== 'granted') {
                console.warn(`${logPrefix} Permission not granted, was '${permission}'.`);
                alert(`Permissie niet verleend. Status: ${permission}`);
                toast({ variant: "destructive", title: "Toestemming geweigerd" });
                setIsLoading(false);
                return;
            }

            console.log(`${logPrefix} ✅ Permission granted. Getting VAPID key...`);
            alert("✅ Permissie verleend. VAPID key ophalen...");
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                throw new Error("VAPID key ontbreekt in de configuratie.");
            }

            console.log(`${logPrefix} VAPID key found. Getting messaging instance...`);
            const messaging = getMessaging(app);
            
            console.log(`${logPrefix} Waiting for service worker...`);
            alert("Wachten op service worker...");
            const serviceWorkerRegistration = await navigator.serviceWorker.ready;
            console.log(`${logPrefix} ✅ Service worker ready. Getting token...`);
            alert("✅ Service worker is klaar. Token ophalen...");

            const currentToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration });

            if (!currentToken) {
                throw new Error("Kon geen FCM-token genereren.");
            }
            
            console.log(`${logPrefix} ✅ Token received: ${currentToken.substring(0, 20)}...`);
            alert(`Token ontvangen! Verzenden naar server...`);

            const response = await fetch('/api/save-fcm-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.uid, token: currentToken })
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'API-fout bij opslaan van token.');
            }
            
            console.log(`${logPrefix} ✅ Token successfully saved via API.`);
            alert("✅ Token succesvol opgeslagen!");
            toast({ title: "Meldingen Ingeschakeld!" });

        } catch (err: any) {
            console.error(`${logPrefix} 🔥 CRITICAL ERROR:`, err);
            alert(`Fout opgetreden: ${err.message}`);
            toast({ variant: "destructive", title: "Fout", description: err.message });
        } finally {
            setIsLoading(false);
        }
    };
    
    // Periodically check permission status in case it's changed in another tab
    useEffect(() => {
        const interval = setInterval(() => {
            if ("Notification" in window) {
                setPermissionStatus(Notification.permission);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    if (permissionStatus === 'unsupported' || !user) {
        return null; 
    }

    return (
        <Alert className="mb-6 bg-primary/10 border-primary/50 text-primary-foreground">
            <BellRing className="h-4 w-4 !text-primary" />
            <AlertTitle className="text-primary/90">Blijf op de hoogte</AlertTitle>
            <AlertDescription className="text-primary/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
               <span>Wil je een herinnering ontvangen voor je dagelijkse check-in of nieuwe chatberichten? Schakel meldingen in.</span>
               <Button onClick={handleRequestPermission} disabled={isLoading || permissionStatus !== 'default'} className="bg-primary/80 text-primary-foreground hover:bg-primary/70 shrink-0">
                    {isLoading ? <Spinner size="small" className="mr-2" /> : <Check className="mr-2 h-4 w-4" />}
                    {isLoading ? 'Bezig...' : 'Meldingen Inschakelen'}
                </Button>
            </AlertDescription>
        </Alert>
    );
}
