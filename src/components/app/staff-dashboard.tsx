
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
import { AlertTriangle, Users, Archive } from "lucide-react";
import { AlertList } from "./alert-list";
import Link from "next/link";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";


export function StaffDashboard({ clubId }: { clubId: string }) {
  const { userProfile, loading } = useUser();
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
                <Button>Open Team Chat</Button>
            </Link>
        </CardContent>
      </Card>
    </div>
  );
}
