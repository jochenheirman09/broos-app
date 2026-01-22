
"use client";

import { StaffUpdates } from "./staff-updates";
import { useUser } from "@/context/user-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Users, Archive, MessageSquare, Pencil, CalendarDays } from "lucide-react";
import { AlertList } from "./alert-list";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { NotificationBadge } from "./notification-badge";
import { NotificationTroubleshooter } from "./notification-troubleshooter";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Team } from "@/lib/types";
import { useState, useCallback } from "react";
import { EditTeamDialog } from "./edit-team-dialog";
import { WeekSchedule } from "./week-schedule";

export function StaffDashboard({ clubId }: { clubId: string }) {
  const { userProfile, loading } = useUser();
  const teamId = userProfile?.teamId;
  const db = useFirestore();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const teamRef = useMemoFirebase(() => {
    if (!clubId || !teamId) return null;
    return doc(db, "clubs", clubId, "teams", teamId);
  }, [db, clubId, teamId]);
  const { data: teamData, isLoading: isTeamLoading, forceRefetch } = useDoc<Team>(teamRef);
  
  const handleTeamChange = useCallback(() => {
    forceRefetch();
    setRefreshKey(prev => prev + 1);
  }, [forceRefetch]);

  if (loading || (teamId && isTeamLoading)) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  if (!teamId) {
    return (
       <Card>
        <CardHeader>
            <CardTitle>Team niet gevonden</CardTitle>
        </CardHeader>
        <CardContent>
             <Alert variant="destructive">
                <AlertTitle>Geen Team Toegewezen</AlertTitle>
                <AlertDescription>
                    Je bent nog niet aan een team toegewezen. Neem contact op met je clubverantwoordelijke.
                </AlertDescription>
            </Alert>
        </CardContent>
       </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                  <CardTitle>Team Inzichten</CardTitle>
                  <CardDescription>
                      De meest recente trends en aandachtspunten voor je team.
                  </CardDescription>
              </div>
              <Link href="/archive/staff-updates" passHref>
                  <Button variant="secondary" size="sm" className="flex items-center relative">
                      <Archive className="mr-2 h-4 w-4" />
                      Bekijk Archief
                      <NotificationBadge type="staffUpdates" />
                  </Button>
              </Link>
            </div>
        </CardHeader>
        <CardContent>
          <StaffUpdates clubId={clubId} teamId={teamId} status="new" showDateInHeader={true} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center text-2xl">
                    <AlertTriangle className="mr-3 h-6 w-6 text-destructive" />
                    Actieve Alerts
                </CardTitle>
                <CardDescription>
                    Een overzicht van zorgwekkende signalen bij spelers in jouw team.
                </CardDescription>
              </div>
              <Link href="/alerts" passHref>
                <Button variant="outline" className="w-full sm:w-auto flex items-center relative">
                    Bekijk Alle Alerts
                    <NotificationBadge type="alerts" status="new" />
                </Button>
              </Link>
          </div>
        </CardHeader>
        <CardContent>
            <AlertList status="new" limit={5} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <CardTitle className="flex items-center">
                <Users className="h-6 w-6 mr-3" />
                Team Chat
            </CardTitle>
            <CardDescription>
                Start een privégesprek met een speler of ander staflid van je team.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Link href="/p2p-chat" passHref>
                <Button className="flex items-center relative">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Open Team Chat
                    <NotificationBadge type="messages" />
                </Button>
            </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center">
                <CalendarDays className="mr-3 h-6 w-6" />
                Jouw Weekschema
              </CardTitle>
              <CardDescription>
                Het trainings- en wedstrijdschema voor jouw team.
              </CardDescription>
            </div>
            {teamData && (
              <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Schema Bewerken
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <WeekSchedule key={refreshKey} />
        </CardContent>
      </Card>

      <NotificationTroubleshooter />
      
      {teamData && (
        <EditTeamDialog
          isOpen={isEditDialogOpen}
          setIsOpen={setIsEditDialogOpen}
          clubId={clubId}
          team={teamData}
          onTeamUpdated={handleTeamChange}
        />
      )}
    </div>
  );
}
