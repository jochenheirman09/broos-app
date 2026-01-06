
"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRequestNotificationPermission } from "@/lib/firebase/messaging";
import { BellRing, Wrench, AlertTriangle, CheckCircle, Info, Send } from "lucide-react";
import { Spinner } from "../ui/spinner";
import { useUser } from "@/context/user-context";
import { sendTestNotification } from "@/actions/notification-actions";
import { Separator } from "../ui/separator";

export function NotificationTroubleshooter() {
    const { user } = useUser();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isTestLoading, setIsTestLoading] = useState(false);
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

    const handleSendTestNotification = async () => {
        if (!user) return;
        setIsTestLoading(true);
        try {
            const result = await sendTestNotification(user.uid);
             if (result.success) {
                toast({
                    title: "Testmelding Verzonden",
                    description: "Je zou binnen enkele seconden een melding moeten ontvangen.",
                });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
             toast({
                variant: "destructive",
                title: "Verzenden Mislukt",
                description: error.message,
            });
        } finally {
            setIsTestLoading(false);
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
        return null; 
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center text-2xl">
                    <Wrench className="mr-3 h-6 w-6 text-muted-foreground" />
                    Notificatie Probleemoplosser
                </CardTitle>
                <CardDescription>
                    Gebruik deze tools als je problemen ondervindt met het ontvangen van push-meldingen.
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
                           Je bent klaar om meldingen te ontvangen. Als je nog steeds problemen hebt, probeer dan de token te vernieuwen of een testmelding te sturen.
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

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button onClick={handleManualTokenRefresh} disabled={isLoading || permissionStatus === 'denied'} className="w-full">
                        {isLoading && <Spinner size="small" className="mr-2" />}
                        {isLoading ? "Bezig..." : "Forceer Token Vernieuwing"}
                    </Button>

                    <Button onClick={handleSendTestNotification} disabled={isTestLoading || permissionStatus !== 'granted'} variant="secondary" className="w-full">
                        {isTestLoading && <Spinner size="small" className="mr-2" />}
                        <Send className="mr-2 h-4 w-4" />
                        {isTestLoading ? "Verzenden..." : "Stuur Testmelding"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
