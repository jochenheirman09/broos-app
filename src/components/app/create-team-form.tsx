"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "../ui/spinner";
import { createTeam } from "@/lib/team";
import { useFirestore } from "@/firebase";

export function CreateTeamForm({
  clubId,
  onTeamCreated,
}: {
  clubId: string;
  onTeamCreated: () => void;
}) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [teamName, setTeamName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (teamName.length < 3) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Teamnaam moet minstens 3 tekens lang zijn.",
      });
      return;
    }

    setIsLoading(true);

    createTeam({
      db: firestore,
      clubId,
      teamName,
    })
      .then(() => {
        toast({
          title: "Succes!",
          description: `Team "${teamName}" is aangemaakt.`,
        });
        setTeamName("");
        onTeamCreated(); // Notify parent that a team was created
      })
      .catch((error) => {
        console.error("Fout bij het maken van het team:", error);
        toast({
          variant: "destructive",
          title: "Fout bij het maken van het team",
          description:
            "Je hebt mogelijk geen toestemming of er is een onverwachte fout opgetreden.",
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="team-name">Teamnaam</Label>
        <Input
          id="team-name"
          name="team-name"
          placeholder="bv. Onder 11s"
          required
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={isLoading} variant="secondary">
        {isLoading && <Spinner size="small" className="mr-2" />}
        {isLoading ? "Team aanmaken..." : "Team aanmaken"}
      </Button>
    </form>
  );
}
