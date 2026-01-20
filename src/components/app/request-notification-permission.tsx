
"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRequestNotificationPermission } from "@/lib/firebase/messaging";
import { BellRing, Check } from "lucide-react";
import { Spinner } from "../ui/spinner";
import { useUser } from "@/context/user-context";
import { useToast } from "@/hooks/use-toast";

export function RequestNotificationPermission() {
    const { user } = useUser();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | "unsupported">(
        () => (typeof window !== "undefined" && "Notification" in window) ? Notification.permission : "unsupported"
    );

    const { requestPermission } = useRequestNotificationPermission();
    
    const handleRequestPermission = async () => {
        console.log("[RequestPermissionButton] onClick handler fired.");
        if (!user) {
            console.error("[RequestPermissionButton] Aborting: user is null inside handler.");
            toast({ variant: 'destructive', title: 'Fout', description: 'Gebruiker niet gevonden. Probeer opnieuw in te loggen.' });
            return;
        }
        setIsLoading(true);
        // Call with isSilent = false to show toasts on success/failure
        // Pass the user object directly to the hook
        const newPermission = await requestPermission(user, false); 
        if (newPermission) {
            setPermissionStatus(newPermission);
        }
        setIsLoading(false);
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

    // Don't show the banner if permission is already granted, denied, or not supported.
    if (permissionStatus !== 'default' || !user) {
        return null; 
    }

    return (
        <Alert className="mb-6 bg-primary/10 border-primary/50 text-primary-foreground">
            <BellRing className="h-4 w-4 !text-primary" />
            <AlertTitle className="text-primary/90">Blijf op de hoogte</AlertTitle>
            <AlertDescription className="text-primary/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
               <span>Wil je een herinnering ontvangen voor je dagelijkse check-in of nieuwe chatberichten? Schakel meldingen in.</span>
               <Button onClick={handleRequestPermission} disabled={isLoading} className="bg-primary/80 text-primary-foreground hover:bg-primary/70 shrink-0">
                    {isLoading ? <Spinner size="small" className="mr-2" /> : <Check className="mr-2 h-4 w-4" />}
                    {isLoading ? 'Bezig...' : 'Meldingen Inschakelen'}
                </Button>
            </AlertDescription>
        </Alert>
    );
}
