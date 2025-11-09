"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query } from "firebase/firestore";
import type { Team } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Copy, KeyRound, Users, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Button } from "../ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { generateTeamInvitationCode } from "@/lib/team";

function TeamRow({
  clubId,
  team,
  onCodeGenerated,
}: {
  clubId: string;
  team: Team;
  onCodeGenerated: () => void;
}) {
  const { toast } = useToast();
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
      await generateTeamInvitationCode(clubId, team.id);
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
    <TableRow>
      <TableCell className="font-medium">{team.name}</TableCell>
      <TableCell>
        {team.invitationCode ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm bg-muted px-3 py-1.5 rounded-lg shadow-clay-inset">
              {team.invitationCode}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(team.invitationCode!)}
              aria-label="Copy invitation code"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
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
      </TableCell>
    </TableRow>
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
    <div className="rounded-2xl border bg-card shadow-clay-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Team Name</TableHead>
            <TableHead>
              <div className="flex items-center">
                <KeyRound className="h-4 w-4 mr-2" />
                Invitation Code
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teams.map((team) => (
            <TeamRow
              key={team.id}
              clubId={clubId}
              team={team}
              onCodeGenerated={onCodeGenerated}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
