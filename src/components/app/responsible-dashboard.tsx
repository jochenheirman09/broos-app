
"use client";

import { useDoc, useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { doc, collection, query, collectionGroup, where } from "firebase/firestore";
import type { Club, Team, MyChat } from "@/lib/types";
import { Spinner } from "../ui/spinner";
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
import { useCallback, useState, useMemo } from "react";
import { ClubUpdates } from "./club-updates";
import { Button } from "../ui/button";
import Link from "next/link";
import { useUser } from "@/context/user-context";
import { StaffUpdates } from "./staff-updates";
import { KnowledgeBaseManager } from "./knowledge-base-stats";
import { AlertList } from "./alert-list";
import { ResponsibleNoClub } from "./responsible-no-club";
import { ClubLogoManager } from "./club-logo-manager";
import { NotificationTroubleshooter } from "./notification-troubleshooter";
import { NotificationBadge } from "./notification-badge";


function ClubManagement({ clubId }: { clubId: string }) {
  const { userProfile, user } = useUser();
  const db = useFirestore();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTeamChange = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  const claimsReady = !!(userProfile && userProfile.role && userProfile.clubId);

  // Queries for Notification Badges
  const myChatsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users", user.uid, "myChats"));
  }, [user, db]);

  const newAlertsQuery = useMemoFirebase(() => {
    if (!clubId) return null;
    return query(collectionGroup(db, 'alerts'), where('clubId', '==', clubId), where('status', '==', 'new'));
  }, [db, clubId]);
  
  const newStaffUpdatesQuery = useMemoFirebase(() => {
      if (!clubId) return null;
      return query(collectionGroup(db, 'staffUpdates'), where('clubId', '==', clubId));
  }, [db, clubId]);

  const newClubUpdatesQuery = useMemoFirebase(() => {
      if (!clubId) return null;
      return query(collection(db, `clubs/${clubId}/clubUpdates`));
  }, [db, clubId]);


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
                <Button variant="secondary" size="sm" className="flex items-center">
                    <Archive className="mr-2 h-4 w-4" />
                    Bekijk Archief
                    <NotificationBadge query={newClubUpdatesQuery} />
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
                    <Button variant="secondary" size="sm" className="flex items-center">
                        <Archive className="mr-2 h-4 w-4" />
                        Bekijk Archief
                        <NotificationBadge query={newStaffUpdatesQuery} />
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
              <Button variant="outline" className="w-full sm:w-auto flex items-center">
                Bekijk Alle Alerts
                <NotificationBadge query={newAlertsQuery} />
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
                <Button className="flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Open Team Chat
                    <NotificationBadge query={myChatsQuery} countField="unreadCounts" />
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
