
"use client";

import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import type { Club, Team } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../ui/card";
import { Building, BookOpen, Users, AlertTriangle, Archive, BellRing } from "lucide-react";
import { Separator } from "../ui/separator";
import { CreateTeamForm } from "./create-team-form";
import { TeamList } from "./team-list";
import { useCallback, useState } from "react";
import { ClubUpdates } from "./club-updates";
import { Button } from "../ui/button";
import Link from "next/link";
import { useUser } from "@/context/user-context";
import { useFirebaseApp } from "@/firebase";
import { StaffUpdates } from "./staff-updates";
import { KnowledgeBaseManager } from "./knowledge-base-stats";
import { AlertList } from "./alert-list";
import { ResponsibleNoClub } from "./responsible-no-club";
import { ClubLogoManager } from "./club-logo-manager";
import { WelcomeHeader } from "./welcome-header";
import { getToken, getMessaging } from "firebase/messaging";
import { useToast } from "@/hooks/use-toast";


function ClubManagement({ clubId }: { clubId: string }) {
  const { userProfile, user } = useUser();
  const [refreshKey, setRefreshKey] = useState(0);
  const app = useFirebaseApp();
  const db = useFirestore();
  const { toast } = useToast();

  const handleTeamChange = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const claimsReady = !!(userProfile && userProfile.role && userProfile.clubId);

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
                <Button variant="secondary" size="sm">
                    <Archive className="mr-2 h-4 w-4" />
                    Bekijk Archief
                </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <ClubUpdates clubId={clubId} status="new" />
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
                    <Button variant="secondary" size="sm">
                        <Archive className="mr-2 h-4 w-4" />
                        Bekijk Archief
                    </Button>
                </Link>
            </div>
        </CardHeader>
        <CardContent>
          <StaffUpdates clubId={clubId} status="new" />
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
              <Button variant="outline" className="w-full sm:w-auto">
                Bekijk Alle Alerts
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {claimsReady ? (
              <AlertList status="new" limit={5} />
          ) : (
              <div className="flex justify-center items-center h-20"><Spinner /></div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center text-2xl">
                <Users className="h-6 w-6 mr-3" />
                Team Chat
            </CardTitle>
        </CardHeader>
        <CardContent>
            <Link href="/p2p-chat" passHref>
                <Button>Open Team Chat</Button>
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
      
    </>
  );
}


export function ResponsibleDashboard({ clubId }: { clubId?: string }) {
    if (!clubId) {
        return (
            <>
                <WelcomeHeader />
                <ResponsibleNoClub />
            </>
        )
    }
  return <ClubManagement clubId={clubId} />;
}
