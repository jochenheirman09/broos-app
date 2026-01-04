
"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRequestNotificationPermission } from "@/lib/firebase/messaging";
import { BellRing, Wrench, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Spinner } from "../ui/spinner";
import { useUser } from "@/context/user-context";

export function NotificationTroubleshooter() {
    const { user } = useUser();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | "unsupported" | "timeout">(
        () => (typeof window !== "undefined" && "Notification" in window) ? Notification.permission : "unsupported"
    );

    const { requestPermission } = useRequestNotificationPermission();

    const handleManualTokenRefresh = async () => {
        setIsLoading(true);
        try {
            const newPermission = await requestPermission(true); // true = it's a manual action
            
            if (newPermission) {
                setPermissionStatus(newPermission);
            }

            if (newPermission === 'granted') {
                 toast({
                    title: "Token Vernieuwd!",
                    description: "Je notificatie-token is succesvol vernieuwd en opgeslagen.",
                });
            } else if (newPermission === 'denied') {
                toast({
                    variant: "destructive",
                    title: "Permissie Geblokkeerd",
                    description: "Je moet meldingen voor deze site handmatig inschakelen in je browserinstellingen.",
                });
            } else if (newPermission === 'timeout') {
                 toast({
                    variant: "destructive",
                    title: "Timeout",
                    description: "De service worker reageerde niet op tijd. Probeer de pagina te herladen.",
                });
            }
        } catch (error: any) {
            console.error("Manual token refresh failed:", error);
            toast({
                variant: "destructive",
                title: "Fout",
                description: `Kon token niet vernieuwen: ${error.message}`,
            });
        } finally {
            setIsLoading(false);
        }
    };
    
    // Periodically check permission status in case it's changed in another tab
    useState(() => {
        const interval = setInterval(() => {
            if ("Notification" in window) {
                setPermissionStatus(Notification.permission);
            }
        }, 5000);
        return () => clearInterval(interval);
    });

    if (permissionStatus === 'unsupported' || !user) {
        return null; // Don't show this component if notifications aren't supported or user isn't logged in
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                    <Wrench className="mr-3 h-6 w-6 text-muted-foreground" />
                    Notificatie Probleemoplosser
                </CardTitle>
                <CardDescription>
                    Gebruik deze tool als je problemen ondervindt met het ontvangen van push-meldingen.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {permissionStatus === 'denied' ? (
                     <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Meldingen Geblokkeerd</AlertTitle>
                        <AlertDescription>
                            Je hebt meldingen voor deze site geblokkeerd. Om meldingen te ontvangen, moet je de permissie handmatig aanpassen in de instellingen van je browser (meestal via het slot-icoontje in de adresbalk).
                        </AlertDescription>
                    </Alert>
                ) : permissionStatus === 'granted' ? (
                    <Alert className="bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400">
                        <CheckCircle className="h-4 w-4 !text-green-500" />
                        <AlertTitle>Meldingen Ingeschakeld</AlertTitle>
                        <AlertDescription>
                           Je bent klaar om meldingen te ontvangen. Als je nog steeds problemen hebt, probeer dan de token te vernieuwen.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Actie Vereist</AlertTitle>
                        <AlertDescription>
                            Je hebt nog geen toestemming gegeven voor meldingen. Gebruik de knop hieronder om dit in te schakelen.
                        </AlertDescription>
                    </Alert>
                )}

                <Button onClick={handleManualTokenRefresh} disabled={isLoading || permissionStatus === 'denied'} className="w-full">
                    {isLoading && <Spinner size="small" className="mr-2" />}
                    {isLoading ? "Bezig..." : "Forceer Token Vernieuwing"}
                </Button>
            </CardContent>
        </Card>
    );
}

