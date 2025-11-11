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
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { WellnessChart } from "./wellness-chart";
import { PlayerUpdates } from "./player-updates";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, limit, query } from "firebase/firestore";
import { Chat } from "@/lib/types";

export function PlayerDashboard() {
  const { userProfile, user } = useUser();
  const db = useFirestore();

  const firstName = userProfile?.name.split(" ")[0];
  const buddyName = userProfile?.buddyName || "Broos";

  // Check if there's any chat history to adjust the button text
  const previousChatsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users", user.uid, "chats"), limit(1));
  }, [user, db]);

  const { data: previousChats } = useCollection<Chat>(previousChatsQuery);

  const hasChatHistory = previousChats ? previousChats.length > 0 : false;

  return (
    <div className="space-y-6">
      <Card className="text-center">
        <CardHeader>
          <CardTitle>
            Jouw Dashboard{firstName ? `, ${firstName}` : ""}
          </CardTitle>
          <CardDescription>
            Klaar voor je dagelijkse check-in met {buddyName}?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/chat">
            <Button size="lg" className="w-full sm:w-auto">
              {hasChatHistory
                ? `Zet je gesprek verder met ${buddyName}`
                : `Start Gesprek met ${buddyName}`}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </CardContent>
      </Card>
      
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
          <CardTitle>Jouw Recente Weetjes</CardTitle>
          <CardDescription>
            Interessante inzichten en vergelijkingen met je team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlayerUpdates />
        </CardContent>
      </Card>
    </div>
  );
}
