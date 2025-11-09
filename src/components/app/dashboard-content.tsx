"use client";

import { useUser } from "@/context/user-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Building, User, Users, Shield } from "lucide-react";
import React, { useCallback, useState } from "react";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Club } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { CreateTeamForm } from "./create-team-form";
import { TeamList } from "./team-list";
import { Separator } from "../ui/separator";

const roleIcons: { [key: string]: React.ReactNode } = {
  player: <User className="h-5 w-5 mr-2" />,
  staff: <Users className="h-5 w-5 mr-2" />,
  responsible: <Shield className="h-5 w-5 mr-2" />,
};

function ClubInfo({ clubId }: { clubId: string }) {
  const firestore = useFirestore();
  const [refreshKey, setRefreshKey] = useState(0);

  const clubRef = useMemoFirebase(
    () => (firestore ? doc(firestore, "clubs", clubId) : null),
    [firestore, clubId]
  );
  const { data: club, isLoading } = useDoc<Club>(clubRef);

  const handleTeamChange = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center p-8">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (!club) {
    return (
      <Card>
        <CardContent>
          <p className="text-destructive">
            Fout: Clubgegevens niet gevonden voor uw account.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-2xl font-bold">
          <Building className="h-7 w-7 mr-3 text-primary" />
          {club.name}
        </CardTitle>
        <CardDescription>
          Beheer hieronder je teams.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-4">Jouw Teams</h3>
          <TeamList
            clubId={club.id}
            key={refreshKey}
            onTeamChange={handleTeamChange}
          />
        </div>
        <Separator />
        <div>
          <h3 className="text-xl font-semibold mb-4">Voeg een Nieuw Team Toe</h3>
          <CreateTeamForm clubId={club.id} onTeamCreated={handleTeamChange} />
        </div>
      </CardContent>
    </Card>
  );
}

function PlayerDashboard() {
  const { userProfile } = useUser();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Speler Dashboard</CardTitle>
        <CardDescription>Welkom op je persoonlijke dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>
          Binnenkort beschikbaar: je welzijnsoverzicht en chat met je buddy!
        </p>
      </CardContent>
    </Card>
  );
}


export function DashboardContent() {
  const { userProfile } = useUser();

  if (!userProfile) {
    return null;
  }

  const { name, role, clubId } = userProfile;
  
  if (role === 'player') {
    return <PlayerDashboard />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold">Welkom, {name}!</CardTitle>
          <div className="flex items-center bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-sm font-medium shadow-clay-inset">
            {roleIcons[role]}
            <span className="capitalize">{role}</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Dit is je hoofddashboard. Beheer hier je club en leden.
          </p>
        </CardContent>
      </Card>

      {role === "responsible" && clubId && <ClubInfo clubId={clubId} />}

      {role === "responsible" && !clubId && (
        <Card className="bg-accent/20 border-accent">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Building className="h-7 w-7 mr-3 text-accent-foreground" />
              Creëer Je Club
            </CardTitle>
            <CardDescription className="text-accent-foreground/80">
              Om de app te blijven gebruiken, moet je een club aanmaken voor je
              account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/create-club">
              <Button
                variant="accent"
                size="lg"
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                Club aanmaken
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
