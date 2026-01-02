
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Spinner } from "../ui/spinner";
import { Wand, ShieldAlert } from "lucide-react";
import { useRequestNotificationPermission } from "@/lib/firebase/messaging";
import { useUser } from "@/context/user-context";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";

export function NotificationTroubleshooter() {
  const { toast } = useToast();
  const { userProfile } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default');
  const { requestPermission } = useRequestNotificationPermission();

  useEffect(() => {
    // Check the initial permission status when the component mounts
    if ("Notification" in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const handleManualTokenRefresh = async () => {
    if (!userProfile) return;

    setIsLoading(true);
    
    try {
      // The requestPermission function handles all logic, including timeouts and server actions.
      // We pass `true` to indicate this is a manual action, which may prompt for permission.
      const finalPermission = await requestPermission(true);

      // Update the component's state with the result.
      setPermissionStatus(finalPermission || 'default');

      if (finalPermission === 'granted') {
        toast({
            title: "Token Vernieuwd!",
            description: "Je apparaat is opnieuw geregistreerd voor push-meldingen."
        });
      } else if (finalPermission === 'denied') {
          // The main UI will now show a persistent message, but a toast is still good for immediate feedback.
          toast({
              variant: "destructive",
              title: "Toestemming Geblokkeerd",
              description: "Je moet meldingen voor deze site handmatig inschakelen in je browser-instellingen."
          });
      } else if (finalPermission === 'timeout') {
          toast({
              variant: "destructive",
              title: "Timeout",
              description: "De service worker reageerde niet op tijd. Probeer de app te herladen."
          });
      } else {
        toast({
            variant: "default",
            title: "Actie geannuleerd",
            description: "De aanvraag voor meldingen is niet voltooid."
        });
      }

    } catch (error: any) {
        console.error("Manual refresh failed:", error);
        toast({
            variant: "destructive",
            title: "Fout bij vernieuwen",
            description: error.message || "Een onbekende fout is opgetreden."
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Card className="bg-orange-500/10 border-orange-500/50">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
                <Wand className="h-5 w-5" />
                <span>Notificatie Probleemoplosser</span>
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-400">
                Gebruik deze tool als je problemen ondervindt met het ontvangen van push-meldingen.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {permissionStatus === 'denied' ? (
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Notificaties Geblokkeerd</AlertTitle>
                    <AlertDescription>
                        Je hebt meldingen voor deze site geblokkeerd. Om notificaties te ontvangen, moet je de toestemming handmatig aanpassen in de site-instellingen van je browser.
                    </AlertDescription>
                </Alert>
            ) : (
                <>
                    <p className="text-sm text-orange-700/90 dark:text-orange-400/90 mb-4">
                        Als je geen meldingen ontvangt, klik dan op de onderstaande knop om de verbinding met de notificatieserver te herstellen en je apparaat opnieuw te registreren.
                    </p>
                    <Button
                        onClick={handleManualTokenRefresh}
                        disabled={isLoading}
                        className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white"
                    >
                        {isLoading && <Spinner size="small" className="mr-2" />}
                        {isLoading ? "Bezig..." : "Forceer Token Vernieuwing"}
                    </Button>
                </>
            )}
        </CardContent>
    </Card>
  );
}
