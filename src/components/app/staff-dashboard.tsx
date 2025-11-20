
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
import { Info, Users } from "lucide-react";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase/client-provider";
import { doc } from "firebase/firestore";
import type { Team, Club } from "@/lib/types";
import { Spinner } from "../ui/spinner";

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
  );
}
