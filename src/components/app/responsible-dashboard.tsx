"use client";

import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Club } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Building, BookOpen, BarChart2 } from "lucide-react";
import { Separator } from "../ui/separator";
import { CreateTeamForm } from "./create-team-form";
import { TeamList } from "./team-list";
import { useCallback, useState } from "react";
import { ClubUpdates } from "./club-updates";
import { KnowledgeBaseStats } from "./knowledge-base-stats";

function ClubManagement({ clubId }: { clubId: string }) {
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
        <CardContent className="p-6">
          <p className="text-destructive">
            Fout: Clubgegevens niet gevonden voor uw account. Dit kan een permissieprobleem zijn.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl font-bold">
            <Building className="h-7 w-7 mr-3 text-primary" />
            {club.name}
          </CardTitle>
          <CardDescription>
            Bekijk hieronder club-brede inzichten die dagelijks automatisch worden bijgewerkt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ClubUpdates clubId={club.id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
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
            <h3 className="text-xl font-semibold mb-4">
              Voeg een Nieuw Team Toe
            </h3>
            <CreateTeamForm clubId={club.id} onTeamCreated={handleTeamChange} />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-6 w-6 mr-3 text-primary" />
            Kennisbank Management
          </CardTitle>
           <CardDescription>
            Overzicht van de documenten die de AI-buddy gebruikt en hoe vaak ze worden geraadpleegd.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <KnowledgeBaseStats clubId={club.id} />
        </CardContent>
      </Card>

    </>
  );
}


export function ResponsibleDashboard({ clubId }: { clubId: string }) {
  return <ClubManagement clubId={clubId} />;
}
