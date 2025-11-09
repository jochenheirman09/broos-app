"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "../ui/spinner";
import { createTeam } from "@/lib/team";

export function CreateTeamForm({
  clubId,
  onTeamCreated,
}: {
  clubId: string;
  onTeamCreated: () => void;
}) {
  const { toast } = useToast();
  const [teamName, setTeamName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (teamName.length < 3) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Team name must be at least 3 characters long.",
      });
      return;
    }

    setIsLoading(true);

    try {
      await createTeam({
        clubId,
        teamName,
      });
      toast({
        title: "Success!",
        description: `Team "${teamName}" has been created.`,
      });
      setTeamName("");
      onTeamCreated(); // Notify parent that a team was created
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast({
        variant: "destructive",
        title: "Error creating team",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="team-name">Team Name</Label>
        <Input
          id="team-name"
          name="team-name"
          placeholder="e.g. Under 11s"
          required
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={isLoading}>
        {isLoading && <Spinner size="small" className="mr-2" />}
        {isLoading ? "Creating Team..." : "Create Team"}
      </Button>
    </form>
  );
}
