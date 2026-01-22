
"use client";

import { useFirestore, useMemoFirebase, useCollection } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import type { Team } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Copy, KeyRound, Users, RefreshCw, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { generateTeamInvitationCode } from "@/lib/firebase/firestore/team";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditTeamDialog } from "./edit-team-dialog";
import { DeleteTeamDialog } from "./delete-team-dialog";
import Link from "next/link";
import { useUser } from "@/context/user-context";

function TeamCard({
  clubId,
  team,
  onTeamChange,
}: {
  clubId: string;
  team: Team;
  onTeamChange: () => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const copyToClipboard = () => {
    if (!team.invitationCode) return;
    navigator.clipboard.writeText(team.invitationCode).then(
      () => {
        toast({
          title: "Code gekopieerd!",
          description: "De uitnodigingscode is naar je klembord gekopieerd.",
        });
      },
      (err) => {
        toast({
          variant: "destructive",
          title: "Kopiëren mislukt",
          description: "Kon de code niet kopiëren.",
        });
      }
    );
  };

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      await generateTeamInvitationCode(firestore, clubId, team.id);
      toast({
        title: "Code gegenereerd!",
        description: `Een nieuwe uitnodigingscode is gegenereerd voor ${team.name}.`,
      });
      onTeamChange(); // Refresh the list
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon geen uitnodigingscode genereren.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Card className="shadow-clay-card bg-card/60 flex flex-col">
        <CardHeader className="p-4 flex-row items-center justify-between">
          <CardTitle className="text-lg">{team.name}</CardTitle>
          <div className="flex items-center gap-1">
             <Link href={`/team/${team.id}`} passHref>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Users className="h-4 w-4" />
                <span className="sr-only">Bekijk Teamleden</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsEditDialogOpen(true)}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Team bewerken</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Team verwijderen</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex-grow">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Uitnodigingscode
            </span>
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0">
          {team.invitationCode ? (
            <div className="flex items-center gap-2 w-full">
              <span className="font-mono text-base bg-muted px-4 py-2 rounded-lg shadow-clay-inset flex-grow text-center">
                {team.invitationCode}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyToClipboard}
                aria-label="Kopieer uitnodigingscode"
              >
                <Copy className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGenerateCode}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Spinner size="small" className="mr-2" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Genereer code
            </Button>
          )}
        </CardFooter>
      </Card>
      <EditTeamDialog
        isOpen={isEditDialogOpen}
        setIsOpen={setIsEditDialogOpen}
        clubId={clubId}
        team={team}
        onTeamUpdated={onTeamChange}
      />
      <DeleteTeamDialog
        isOpen={isDeleteDialogOpen}
        setIsOpen={setIsDeleteDialogOpen}
        clubId={clubId}
        teamId={team.id}
        teamName={team.name}
        onTeamDeleted={onTeamChange}
      />
    </>
  );
}

export function TeamList({
  clubId,
  onTeamChange,
}: {
  clubId: string;
  onTeamChange: () => void;
}) {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  
  // Defensive check: only create the query if clubId is valid.
  const teamsQuery = useMemoFirebase(
    () =>
      firestore && clubId && userProfile?.role === 'responsible'
        ? query(collection(firestore, "clubs", clubId, "teams"), orderBy("name"))
        : null,
    [firestore, clubId, userProfile]
  );
  const { data: teams, isLoading, error } = useCollection<Team>(teamsQuery);

  if (isLoading) {
    return <div className="flex justify-center p-8"><Spinner /></div>;
  }

  // Gracefully handle Firestore errors.
  if (error) {
    return (
        <Alert variant="destructive">
            <AlertTitle>Fout bij het laden</AlertTitle>
            <AlertDescription>
                Kon de teams niet laden. Dit kan een permissieprobleem zijn. Zorg ervoor dat u bent ingelogd en de juiste rechten heeft.
            </AlertDescription>
        </Alert>
    )
  }

  // Gracefully handle the empty state.
  if (!teams || teams.length === 0) {
    return (
      <Alert className="bg-background">
        <Users className="h-4 w-4" />
        <AlertTitle>Nog Geen Teams</AlertTitle>
        <AlertDescription>
          Je hebt nog geen teams aangemaakt voor je club. Voeg er hieronder een
          toe om te beginnen met het beheren van je club.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          clubId={clubId}
          team={team}
          onTeamChange={onTeamChange}
        />
      ))}
    </div>
  );
}
