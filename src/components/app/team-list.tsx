"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query } from "firebase/firestore";
import type { Team } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Copy, KeyRound, Users, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { generateTeamInvitationCode } from "@/lib/team";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";

function TeamCard({
  clubId,
  team,
  onCodeGenerated,
}: {
  clubId: string;
  team: Team;
  onCodeGenerated: () => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isGenerating, setIsGenerating] = useState(false);

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Invitation code copied to clipboard.",
    });
  };

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      await generateTeamInvitationCode(firestore, clubId, team.id);
      toast({
        title: "Code Generated!",
        description: `A new invitation code has been generated for ${team.name}.`,
      });
      onCodeGenerated(); // Refresh the list
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate invitation code.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="shadow-clay-card bg-card/60">
      <CardHeader className="p-4">
        <CardTitle className="text-lg">{team.name}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Invitation Code</span>
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
              onClick={() => copyToClipboard(team.invitationCode!)}
              aria-label="Copy invitation code"
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
            Generate Code
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export function TeamList({
  clubId,
  onCodeGenerated,
}: {
  clubId: string;
  onCodeGenerated: () => void;
}) {
  const firestore = useFirestore();
  const teamsQuery = useMemoFirebase(
    () =>
      firestore ? query(collection(firestore, "clubs", clubId, "teams")) : null,
    [firestore, clubId]
  );
  const { data: teams, isLoading } = useCollection<Team>(teamsQuery);

  if (isLoading) {
    return <Spinner />;
  }

  if (!teams || teams.length === 0) {
    return (
      <Alert className="bg-background">
        <Users className="h-4 w-4" />
        <AlertTitle>No Teams Yet</AlertTitle>
        <AlertDescription>
          You haven't created any teams for your club. Add one below.
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
          onCodeGenerated={onCodeGenerated}
        />
      ))}
    </div>
  );
}
