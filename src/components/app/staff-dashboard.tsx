
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
import { Alert, AlertTitle, AlertDescription } from "../ui/alert";
import { AlertTriangle, Users, Archive, MessageSquare } from "lucide-react";
import { AlertList } from "./alert-list";
import Link from "next/link";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { useMemo } from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query } from "firebase/firestore";
import type { MyChat } from "@/lib/types";
import { NotificationTroubleshooter } from "./notification-troubleshooter";
import { RequestNotificationPermission } from "./request-notification-permission";


function UnreadChatBadge({ userId }: { userId: string }) {
    const db = useFirestore();

    const myChatsQuery = useMemoFirebase(() => {
        return query(collection(db, "users", userId, "myChats"));
    }, [userId, db]);

    const { data: myChats, isLoading } = useCollection<MyChat>(myChatsQuery);
    
    const totalUnreadCount = useMemo(() => {
        if (isLoading || !myChats) return 0;
        return myChats.reduce((total, chat) => {
            const count = chat.unreadCounts?.[userId] || 0;
            return total + count;
        }, 0);
    }, [myChats, userId, isLoading]);

    if (isLoading || totalUnreadCount === 0) return null;

    return (
        <span className="relative flex h-3 w-3 ml-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
        </span>
    );
}

export function StaffDashboard({ clubId }: { clubId: string }) {
  const { user, userProfile, loading } = useUser();
  const teamId = userProfile?.teamId;

  if (loading) {
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

  const claimsReady = !!(userProfile && userProfile.role && userProfile.clubId && userProfile.teamId);

  return (
    <div className="space-y-6">
      <RequestNotificationPermission />
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
                  <Button variant="secondary" size="sm">
                      <Archive className="mr-2 h-4 w-4" />
                      Bekijk Archief
                  </Button>
              </Link>
            </div>
        </CardHeader>
        <CardContent>
          <StaffUpdates clubId={clubId} teamId={teamId} status="new" />
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
                <Button>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Open Team Chat
                    {user && <UnreadChatBadge userId={user.uid} />}
                </Button>
            </Link>
        </CardContent>
      </Card>
      
      <NotificationTroubleshooter />
    </div>
  );
}
