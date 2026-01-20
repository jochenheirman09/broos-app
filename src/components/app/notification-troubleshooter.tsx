
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { BellRing, Wrench } from "lucide-react";
import { useUser } from "@/context/user-context";
import { useRequestNotificationPermission } from "@/lib/firebase/messaging";
import { useState } from "react";
import { Spinner } from "../ui/spinner";

export function NotificationTroubleshooter() {
    const { user } = useUser();
    const { requestPermission } = useRequestNotificationPermission();
    const [isLoading, setIsLoading] = useState(false);

    const handleSync = async () => {
        setIsLoading(true);
        // The requestPermission hook now handles all logic.
        // We pass `true` to indicate it's a manual trigger, so it will
        // request permission if needed and show toasts on success/failure.
        await requestPermission(user, true);
        setIsLoading(false);
    };
    
    // Only show this component if notifications are supported by the browser.
    if (typeof window !== 'undefined' && !('Notification' in window)) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Wrench className="h-6 w-6 text-muted-foreground" />
                    Notificatie Probleemoplosser
                </CardTitle>
                <CardDescription>
                    Gebruik deze knop als je geen meldingen ontvangt. Dit zal de toestemming opnieuw vragen (indien nodig) en je apparaat synchroniseren met onze meldingsservice.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={handleSync} disabled={isLoading} className="w-full sm:w-auto">
                    {isLoading ? <Spinner size="small" className="mr-2" /> : <BellRing className="mr-2 h-4 w-4" />}
                    {isLoading ? 'Synchroniseren...' : 'Synchroniseer Meldingen'}
                </Button>
            </CardContent>
        </Card>
    )
}
