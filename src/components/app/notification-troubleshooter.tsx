"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUser } from "@/context/user-context";
import { useToast } from "@/hooks/use-toast";
import { useFirebaseApp, useFirestore } from "@/firebase";
import { getMessaging, getToken } from "firebase/messaging";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useState } from "react";
import { Spinner } from "../ui/spinner";
import { BellRing, Wand } from "lucide-react";

export function NotificationTroubleshooter() {
  const { userProfile } = useUser();
  const db = useFirestore();
  const app = useFirebaseApp();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleManualTokenRefresh = async () => {
    if (!userProfile?.uid) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Je bent niet ingelogd.",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      // 1. Vraag permissie expliciet (cruciaal voor nieuwe tokens)
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast({
          variant: "destructive",
          title: "Geen Toestemming",
          description: "Geef toestemming voor meldingen in je browser-instellingen."
        });
        setIsLoading(false);
        return;
      }

      // 2. Ensure Service Worker is ready
      if (!('serviceWorker' in navigator)) {
        throw new Error("Service Workers worden niet ondersteund door deze browser.");
      }
      const registration = await navigator.serviceWorker.ready;
      
      // 3. Get fresh token
      const messaging = getMessaging(app);
      const currentToken = await getToken(messaging, { 
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        serviceWorkerRegistration: registration 
      });

      if (currentToken) {
        // 4. Save to the subcollection
        const tokenRef = doc(db, 'users', userProfile.uid, 'fcmTokens', currentToken);
        await setDoc(tokenRef, {
          token: currentToken,
          lastUpdated: serverTimestamp(),
          platform: 'web',
          manualRefresh: true
        }, { merge: true });
        
        toast({
          title: "Token Vernieuwd!",
          description: "Je apparaat is opnieuw geregistreerd voor push-meldingen."
        });
      } else {
        throw new Error("Geen token gegenereerd. Probeer de sitegegevens te wissen en opnieuw te installeren.");
      }
    } catch (error: any) {
      console.error("Manual refresh failed:", error);
      toast({
        variant: "destructive",
        title: "Vernieuwen Mislukt",
        description: error.message || "Er is een onbekende fout opgetreden."
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
