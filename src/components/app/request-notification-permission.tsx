
"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BellRing, Check } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useUser } from "@/context/user-context";
import { useRequestNotificationPermission } from "@/lib/firebase/messaging";

export function RequestNotificationPermission() {
    const { user } = useUser();
    const { requestPermission } = useRequestNotificationPermission();
    const [isLoading, setIsLoading] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | "unsupported">("default");

    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            setPermissionStatus(Notification.permission);
        } else {
            setPermissionStatus("unsupported");
        }
    }, []);

    const handleRequestPermission = async () => {
        setIsLoading(true);
        // Pass `true` to indicate this is a manual user action.
        const success = await requestPermission(user, true); 
        if (success) {
            setPermissionStatus('granted');
        }
        setIsLoading(false);
    };
    
    useEffect(() => {
        const interval = setInterval(() => {
            if ("Notification" in window) {
                setPermissionStatus(Notification.permission);
            }
        }, 3000); 
        return () => clearInterval(interval);
    }, []);

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
