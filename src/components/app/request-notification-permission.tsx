
'use client';

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BellRing, Check } from "lucide-react";
import { useRequestNotificationPermission } from "@/lib/firebase/messaging";
import { useUser } from "@/context/user-context";

export function RequestNotificationPermission() {
    const { user } = useUser();
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | "unsupported">("default");
    const { requestPermission } = useRequestNotificationPermission();

    useEffect(() => {
        if (!user) return; // Only run if user is logged in
        if ("Notification" in window) {
            const currentPermission = Notification.permission;
            setPermissionStatus(currentPermission);
            // If permission is already granted, silently try to get/refresh the token.
            if (currentPermission === 'granted') {
                requestPermission(true);
            }
        } else {
            setPermissionStatus("unsupported");
        }
    }, [user, requestPermission]);

    const handleRequestPermission = async () => {
        const newPermission = await requestPermission();
        if (newPermission) {
            setPermissionStatus(newPermission);
        }
    };

    if (permissionStatus === 'granted' || permissionStatus === 'unsupported' || permissionStatus === 'denied') {
        return null;
    }

    return (
        <Alert className="mb-6 bg-primary/10 border-primary/50 text-primary-foreground">
            <BellRing className="h-4 w-4 !text-primary" />
            <AlertTitle className="text-primary/90">Blijf op de hoogte</AlertTitle>
            <AlertDescription className="text-primary/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
               <span>Wil je een herinnering ontvangen voor je dagelijkse check-in of nieuwe chatberichten? Schakel meldingen in.</span>
               <Button onClick={handleRequestPermission} className="bg-primary/80 text-primary-foreground hover:bg-primary/70 shrink-0">
                    <Check className="mr-2 h-4 w-4" />
                    Meldingen Inschakelen
                </Button>
            </AlertDescription>
        </Alert>
    );
}
