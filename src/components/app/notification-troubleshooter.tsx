
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
import { useState } from "react";
import { Spinner } from "../ui/spinner";
import { Wand } from "lucide-react";
import { useRequestNotificationPermission } from "@/lib/firebase/messaging";

export function NotificationTroubleshooter() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const { requestPermission } = useRequestNotificationPermission();

  const handleManualTokenRefresh = async () => {
    setIsLoading(true);
    
    // The requestPermission function now contains all the logic,
    // including timeouts and error handling. We pass `false` to
    // ensure it actively prompts the user if needed.
    const finalPermission = await requestPermission(false);

    // Provide feedback to the user based on the outcome.
    if (finalPermission === 'granted') {
       toast({
          title: "Token Vernieuwd!",
          description: "Je apparaat is opnieuw geregistreerd voor push-meldingen."
        });
    } else if (finalPermission === 'denied') {
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
    }
    
    setIsLoading(false);
  };

  return (
    <Card className="bg-orange-500/10 border-orange-500/50">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-300">
                <Wand className="h-5 w-5" />
                <span>Notificatie Probleemoplosser</span>
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-400">
                Als je geen notificaties ontvangt, klik dan op de onderstaande knop om je apparaat opnieuw te registreren.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Button
                onClick={handleManualTokenRefresh}
                disabled={isLoading}
                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white"
            >
                {isLoading && <Spinner size="small" className="mr-2" />}
                {isLoading ? "Bezig..." : "Forceer Token Vernieuwing"}
            </Button>
        </CardContent>
    </Card>
  );
}
