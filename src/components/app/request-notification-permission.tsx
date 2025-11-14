
'use client';

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BellRing, Check } from "lucide-react";
import { useRequestNotificationPermission } from "@/lib/firebase/messaging";

export function RequestNotificationPermission() {
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | "unsupported">("default");
    const { requestPermission } = useRequestNotificationPermission();

    useEffect(() => {
        if ("Notification" in window) {
            setPermissionStatus(Notification.permission);
        } else {
            setPermissionStatus("unsupported");
        }
    }, []);

    const handleRequestPermission = async () => {
        await requestPermission();
        // Re-check permission status after request
        if ("Notification" in window) {
            setPermissionStatus(Notification.permission);
        }
    };

    if (permissionStatus === 'granted' || permissionStatus === 'unsupported' || permissionStatus === 'denied') {
        // Don't show the component if permission is already granted, denied or not supported
        return null;
    }

    return (
        <Alert className="bg-primary/10 border-primary/50 text-primary-foreground">
            <BellRing className="h-4 w-4 !text-primary" />
            <AlertTitle className="text-primary/90">Blijf op de hoogte</AlertTitle>
            <AlertDescription className="text-primary/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
               <span>Wil je een herinnering ontvangen voor je dagelijkse check-in? Schakel meldingen in.</span>
               <Button onClick={handleRequestPermission} className="bg-primary/80 text-primary-foreground hover:bg-primary/70 shrink-0">
                    <Check className="mr-2 h-4 w-4" />
                    Meldingen Inschakelen
                </Button>
            </AlertDescription>
        </Alert>
    );
}
