"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query } from "firebase/firestore";
import type { Team } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Copy, KeyRound, Users } from "lucide-react";
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

function TeamRow({ team }: { team: Team }) {
  const { toast } = useToast();

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Invitation code copied to clipboard.",
    });
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{team.name}</TableCell>
      <TableCell>
        {team.invitationCode ? (
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
              {team.invitationCode}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(team.invitationCode!)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground">N/A</span>
        )}
      </TableCell>
    </TableRow>
  );
}

export function TeamList({ clubId }: { clubId: string }) {
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
      <Alert>
        <Users className="h-4 w-4" />
        <AlertTitle>No Teams Yet</AlertTitle>
        <AlertDescription>
          You haven't created any teams for your club. Add one below.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Team Name</TableHead>
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
          <TeamRow key={team.id} team={team} />
        ))}
      </TableBody>
    </Table>
  );
}
