
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
import { ArrowRight, Users, Info, Archive } from "lucide-react";
import Link from "next/link";
import { WellnessChart } from "./wellness-chart";
import { PlayerUpdates } from "./player-updates";
import { Spinner } from "../ui/spinner";
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
import { AddTrainingDialog } from "./add-training-dialog";
import { useState } from "react";
import { CalendarPlus } from "lucide-react";
import { NotificationTroubleshooter } from "./notification-troubleshooter";
import { NotificationBadge } from "./notification-badge";

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
  const { userProfile } = useUser();
  const [isAddTrainingOpen, setIsAddTrainingOpen] = useState(false);
  const [refreshSchedule, setRefreshSchedule] = useState(0);

  const onTrainingAdded = () => {
    setIsAddTrainingOpen(false);
    setRefreshSchedule(prev => prev + 1);
  };
  
  if (!userProfile) {
    return null;
  }

  if (!userProfile.birthDate || !userProfile.teamId) {
    return (
        <ProfileIncompleteAlert />
    );
  }
  
  return (
    <>
      <div className="space-y-6">
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
                      <Button variant="secondary" size="sm" className="flex items-center relative">
                          <Archive className="mr-2 h-4 w-4" />
                          Bekijk Archief
                          <NotificationBadge type="playerUpdates" />
                      </Button>
                  </Link>
              </div>
          </CardHeader>
          <CardContent>
            <PlayerUpdates status="new" showDateInHeader={true} />
          </CardContent>
        </Card>

        <NotificationTroubleshooter />
      </div>
      
       <div className="fixed bottom-24 right-4 z-50">
        <Button size="icon" className="rounded-full h-14 w-14 shadow-lg" onClick={() => setIsAddTrainingOpen(true)}>
          <CalendarPlus className="h-6 w-6" />
        </Button>
      </div>

      <AddTrainingDialog
        isOpen={isAddTrainingOpen}
        setIsOpen={setIsAddTrainingOpen}
        onTrainingAdded={onTrainingAdded}
      />
    </>
  );
}
