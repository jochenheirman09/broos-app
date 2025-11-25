
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
import { Info, AlertTriangle } from "lucide-react";
import { AlertList } from "./alert-list";
import { Button } from "../ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";


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
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-6 w-6 mr-3 text-destructive" />
                Recente Alerts
              </CardTitle>
              <CardDescription>
                De laatste zorgwekkende signalen van spelers in je team.
              </CardDescription>
            </div>
            <Link href="/alerts" passHref>
                <Button variant="ghost">
                    Bekijk alles <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <AlertList limit={3} />
        </CardContent>
      </Card>
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
    </>
  );
}
