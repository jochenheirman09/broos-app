

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
import { ArrowRight, Users } from "lucide-react";
import Link from "next/link";
import { WellnessChart } from "./wellness-chart";
import { PlayerUpdates } from "./player-updates";
import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase/client-provider";
import { collection, limit, query, doc } from "firebase/firestore";
import { Chat, Team, Club } from "@/lib/types";
import { RequestNotificationPermission } from "./request-notification-permission";
import { Spinner } from "../ui/spinner";

export function PlayerDashboard() {
  const { userProfile, user } = useUser();
  const db = useFirestore();

  const firstName = userProfile?.name.split(" ")[0];
  const buddyName = userProfile?.buddyName || "Broos";

  // Fetch team and club data
  const teamRef = useMemoFirebase(() => {
    if (!userProfile?.clubId || !userProfile?.teamId) return null;
    return doc(db, "clubs", userProfile.clubId, "teams", userProfile.teamId);
  }, [db, userProfile?.clubId, userProfile?.teamId]);
  const { data: teamData, isLoading: teamLoading } = useDoc<Team>(teamRef);

  const clubRef = useMemoFirebase(() => {
    if (!userProfile?.clubId) return null;
    return doc(db, "clubs", userProfile.clubId);
  }, [db, userProfile?.clubId]);
  const { data: clubData, isLoading: clubLoading } = useDoc<Club>(clubRef);


  // Check if there's any chat history to adjust the button text
  const previousChatsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users", user.uid, "chats"), limit(1));
  }, [user, db]);

  const { data: previousChats } = useCollection<Chat>(previousChatsQuery);

  const hasChatHistory = previousChats ? previousChats.length > 0 : false;
  
  const isLoadingAffiliation = teamLoading || clubLoading;

  return (
    <div className="space-y-6">
       <RequestNotificationPermission />

      <Card className="text-center">
        <CardHeader>
          <CardTitle>
            Jouw Dashboard{firstName ? `, ${firstName}` : ""}
          </CardTitle>
          {isLoadingAffiliation ? (
            <div className="flex justify-center items-center h-5">
              <Spinner size="small" />
            </div>
          ) : (
            teamData && clubData && (
              <CardDescription className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4" /> Lid van team <strong>{teamData.name}</strong> van <strong>{clubData.name}</strong>
              </CardDescription>
            )
          )}
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
