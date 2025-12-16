
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
import { AlertTriangle, Users } from "lucide-react";
import { AlertList } from "./alert-list";
import Link from "next/link";
import { Button } from "../ui/button";


export function StaffDashboard({ clubId }: { clubId: string }) {
  const { userProfile } = useUser();
  const teamId = userProfile?.teamId;


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
          <CardTitle>Team Inzichten</CardTitle>
          <CardDescription>
            Een overzicht van de wekelijkse trends en aandachtspunten voor je team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StaffUpdates clubId={clubId} teamId={teamId} />
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
