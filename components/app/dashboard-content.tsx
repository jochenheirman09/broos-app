
"use client";

import { useUser } from "@/context/user-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { User, Users, Shield } from "lucide-react";
import React from "react";
import { PlayerDashboard } from "./player-dashboard";
import { StaffDashboard } from "./staff-dashboard";
import { ResponsibleDashboard } from "./responsible-dashboard";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Club, Team } from "@/lib/types";
import { Spinner } from "../ui/spinner";


const roleIcons: { [key: string]: React.ReactNode } = {
  player: <User className="h-5 w-5 mr-2" />,
  staff: <Users className="h-5 w-5 mr-2" />,
  responsible: <Shield className="h-5 w-5 mr-2" />,
};

function StaffWelcomeHeader() {
    const { userProfile, loading: userLoading } = useUser();
    const db = useFirestore();

    const teamRef = useMemoFirebase(() => {
        if (!userProfile?.clubId || !userProfile?.teamId) return null;
        return doc(db, "clubs", userProfile.clubId, "teams", userProfile.teamId);
    }, [db, userProfile?.clubId, userProfile?.teamId]);
    const { data: teamData, isLoading: teamLoading } = useDoc<Team>(teamRef);

    const clubRef = useMemoFirebase(() => {
        if (!userProfile?.clubId) return null;
        return doc(db, "clubs", userProfile.clubId);
    }, [db, userProfile?.clubId]);
    const { data: clubData, isLoading: clubLoading } = useDoc<Club>(clubRef);

    const isLoadingAffiliation = userLoading || teamLoading || clubLoading;

    return (
        <CardContent>
            <p className="text-muted-foreground">
            Dit is je hoofddashboard. Beheer hier je team en bekijk de inzichten.
            </p>
            {isLoadingAffiliation ? (
                <div className="flex items-center h-5 mt-2">
                    <Spinner size="small" />
                </div>
            ) : (
                teamData && clubData && (
                <p className="text-muted-foreground flex items-center gap-2 pt-1">
                    <Users className="h-4 w-4" /> Lid van team <strong>{teamData.name}</strong> van <strong>{clubData.name}</strong>
                </p>
                )
            )}
        </CardContent>
    )
}


export function DashboardContent() {
  const { userProfile } = useUser();

  if (!userProfile) {
    return null;
  }

  const { name, role, clubId } = userProfile;

  return (
    <div className="space-y-6">
      {role !== 'player' && (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-2xl font-bold">Welkom, {name}!</CardTitle>
            <div className="flex items-center bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-sm font-medium shadow-clay-inset">
                {roleIcons[role]}
                <span className="capitalize">{role}</span>
            </div>
            </CardHeader>
            {role === 'staff' ? (
                <StaffWelcomeHeader />
            ) : (
                <CardContent>
                    <p className="text-muted-foreground">
                    Dit is je hoofddashboard. Beheer hier je club en leden.
                    </p>
                </CardContent>
            )}
        </Card>
      )}
      
      {role === 'player' && <PlayerDashboard />}
      {role === 'staff' && clubId && <StaffDashboard clubId={clubId} />}
      {role === 'responsible' && <ResponsibleDashboard clubId={clubId} />}
    </div>
  );
}
