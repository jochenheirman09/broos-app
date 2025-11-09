"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "../ui/spinner";
import { useFirestore } from "@/firebase";
import type { Team } from "@/lib/types";
import { updateTeam } from "@/lib/team";

interface EditTeamDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  clubId: string;
  team: Team;
  onTeamUpdated: () => void;
}

export function EditTeamDialog({
  isOpen,
  setIsOpen,
  clubId,
  team,
  onTeamUpdated,
}: EditTeamDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [teamName, setTeamName] = useState(team.name);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTeamName(team.name);
    }
  }, [isOpen, team.name]);

  const handleSubmit = async () => {
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
      await updateTeam({
        db: firestore,
        clubId,
        teamId: team.id,
        newName: teamName,
      });
      toast({
        title: "Success!",
        description: `Team name updated to "${teamName}".`,
      });
      onTeamUpdated();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error updating team:", error);
      toast({
        variant: "destructive",
        title: "Error updating team",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Team Name</DialogTitle>
          <DialogDescription>
            Enter the new name for the team &quot;{team.name}&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. Under 11s"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Spinner size="small" className="mr-2" />}
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
