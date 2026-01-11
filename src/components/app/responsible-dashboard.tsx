
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Building, BookOpen, Users, AlertTriangle, Archive, MessageSquare } from "lucide-react";
import { CreateTeamForm } from "./create-team-form";
import { TeamList } from "./team-list";
import { useCallback, useState } from "react";
import { ClubUpdates } from "./club-updates";
import { Button } from "../ui/button";
import Link from "next/link";
import { StaffUpdates } from "./staff-updates";
import { KnowledgeBaseManager } from "./knowledge-base-stats";
import { AlertList } from "./alert-list";
import { ResponsibleNoClub } from "./responsible-no-club";
import { ClubLogoManager } from "./club-logo-manager";
import { NotificationTroubleshooter } from "./notification-troubleshooter";
import { NotificationBadge } from "./notification-badge";
import { useUser } from "@/context/user-context";

function ClubManagement({ clubId }: { clubId: string }) {
  const { userProfile } = useUser();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTeamChange = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center text-2xl font-bold">
                <Building className="h-7 w-7 mr-3 text-primary" />
                Club Overzicht
              </CardTitle>
              <CardDescription>
                  De meest recente club-brede inzichten.
              </CardDescription>
            </div>
             <Link href="/archive/club-updates" passHref>
                <Button variant="secondary" size="sm" className="flex items-center relative">
                    <Archive className="mr-2 h-4 w-4" />
                    Bekijk Archief
                    <NotificationBadge type="clubUpdates" />
                </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <ClubUpdates clubId={clubId} status="new" showDateInHeader={true} />
        </CardContent>
      </Card>

      <Card>
         <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <CardTitle className="flex items-center text-2xl">Team Inzichten</CardTitle>
                    <CardDescription>
                        Een overzicht van de meest recente trends per team.
                    </CardDescription>
                </div>
                 <Link href="/archive/staff-updates" passHref>
                    <Button variant="secondary" size="sm" className="flex items-center relative">
                        <Archive className="mr-2 h-4 w-4" />
                        Bekijk Archief
                    </Button>
                 </Link>
            </div>
        </CardHeader>
        <CardContent>
          <StaffUpdates clubId={clubId} status="new" showDateInHeader={true} />
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
                Start een privégesprek of groepsgesprek.
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
          <CardTitle className="text-2xl">Team Management</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="text-xl font-semibold mb-4">Jouw Teams</h3>
            <TeamList
              clubId={clubId}
              key={refreshKey}
              onTeamChange={handleTeamChange}
            />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-4">
              Voeg een Nieuw Team Toe
            </h3>
            <CreateTeamForm clubId={clubId} onTeamCreated={handleTeamChange} />
          </div>
        </CardContent>
      </Card>

      <ClubLogoManager clubId={clubId} />
      
      <Card>
        <CardHeader>
             <CardTitle className="flex items-center text-2xl">
                <BookOpen className="h-6 w-6 mr-3" />
                Kennisbank
            </CardTitle>
        </CardHeader>
        <CardContent>
            <KnowledgeBaseManager />
        </CardContent>
      </Card>

      <NotificationTroubleshooter />
    </>
  );
}


export function ResponsibleDashboard({ clubId }: { clubId?: string }) {
    if (!clubId) {
        return (
            <ResponsibleNoClub />
        )
    }
  return <ClubManagement clubId={clubId} />;
}
