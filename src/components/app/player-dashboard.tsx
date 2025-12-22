
"use client";

import { useUser } from "@/context/user-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Info, Archive, BellRing } from "lucide-react";
import Link from "next/link";
import { WellnessChart } from "./wellness-chart";
import { PlayerUpdates } from "./player-updates";
import { useDoc, useFirestore, useMemoFirebase, useAuth, useFirebaseApp } from "@/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import type { Club, Team } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
import { WelcomeHeader } from "./welcome-header";
import { RequestNotificationPermission } from "./request-notification-permission";
import { getToken, getMessaging } from "firebase/messaging";
import { useToast } from "@/hooks/use-toast";

function ProfileIncompleteAlert() {
  return (
    <Alert variant="destructive">
      <Info className="h-4 w-4" />
      <AlertTitle>Profiel Onvolledig</AlertTitle>
      <AlertDescription>
        Je profiel is nog niet volledig ingevuld.
        <Link href="/complete-profile" className="font-bold underline ml-1">Klik hier</Link> om het af te maken.
      </AlertDescription>
    </Alert>
  );
}

export function PlayerDashboard() {
  const { userProfile, user } = useUser();
  const db = useFirestore();
  const app = useFirebaseApp();
  const { toast } = useToast();

  const handleForceToken = async () => {
    if (!user || !userProfile?.uid || !app) return;
    console.log("Start handmatige token check...");
    try {
      const messaging = getMessaging(app);
      const permission = await Notification.requestPermission();
      console.log("Notificatie status:", permission);
      
      if (permission === 'granted') {
        const currentToken = await getToken(messaging, { 
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
        });
        
        if (currentToken) {
          console.log("Token ontvangen:", currentToken);
          const tokenRef = doc(db, 'users', userProfile.uid, 'fcmTokens', currentToken);
          await setDoc(tokenRef, { 
              token: currentToken, 
              lastUpdated: serverTimestamp(),
              platform: 'web'
          }, { merge: true });
          alert("Succes! Token is opgeslagen. Check nu Firestore.");
          toast({ title: "Token Opgeslagen", description: "De FCM token is succesvol opgeslagen." });
        } else {
          console.warn("Geen token ontvangen. Is de Service Worker actief en correct geconfigureerd?");
          alert("Fout: Geen token ontvangen. Controleer de console voor meer informatie.");
        }
      }
    } catch (err) {
      console.error("Token fout:", err);
      alert("Er is een fout opgetreden bij het ophalen van de token. Controleer de console.");
    }
  };


  if (!userProfile) {
    return null;
  }

  if (!userProfile.birthDate || !userProfile.teamId) {
    return (
      <div className="space-y-6">
        <WelcomeHeader />
        <ProfileIncompleteAlert />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      
      <RequestNotificationPermission />

      <Card>
        <CardHeader>
          <CardTitle>Recent Welzijnsoverzicht</CardTitle>
          <CardDescription>
            Een visueel overzicht van je recente scores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WellnessChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <CardTitle>Jouw Recente Weetjes</CardTitle>
                    <CardDescription>
                        Interessante inzichten en vergelijkingen met je team.
                    </CardDescription>
                </div>
                <Link href="/archive/player-updates" passHref>
                    <Button variant="secondary" size="sm">
                        <Archive className="mr-2 h-4 w-4" />
                        Bekijk Archief
                    </Button>
                </Link>
            </div>
        </CardHeader>
        <CardContent>
          <PlayerUpdates status="new" />
        </CardContent>
      </Card>

      {/* Tijdelijke Debug Knop */}
      {process.env.NODE_ENV === 'development' && (
        <Card className="border-yellow-500/50">
          <CardHeader>
            <CardTitle className="text-yellow-600">Debug: Forceer Token</CardTitle>
            <CardDescription>Deze knop forceert het opvragen en opslaan van de FCM token.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleForceToken} variant="outline">
              <BellRing className="mr-2 h-4 w-4" />
              Start Token Test
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
