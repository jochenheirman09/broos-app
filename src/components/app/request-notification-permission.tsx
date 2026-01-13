
"use client";

import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRequestNotificationPermission } from "@/lib/firebase/messaging";
import { BellRing, Check } from "lucide-react";
import { Spinner } from "../ui/spinner";
import { useUser } from "@/context/user-context";

export function RequestNotificationPermission() {
    const { user } = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | "unsupported">("default");
    const { requestPermission } = useRequestNotificationPermission();

    // Effect to check initial permission status on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermissionStatus(Notification.permission);
        } else {
            setPermissionStatus("unsupported");
        }
    }, []);

    const handleRequestPermission = async () => {
        if (!user) return;
        setIsLoading(true);
        // Call with isSilent = false to show toasts on success/failure
        const newPermission = await requestPermission(user.uid, false); 
        if (newPermission) {
            setPermissionStatus(newPermission);
        }
        setIsLoading(false);
    };

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
