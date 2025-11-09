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
        title: "Fout",
        description: "Teamnaam moet minstens 3 tekens lang zijn.",
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
        title: "Succes!",
        description: `Teamnaam bijgewerkt naar "${teamName}".`,
      });
      onTeamUpdated();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Fout bij het bijwerken van het team:", error);
      toast({
        variant: "destructive",
        title: "Fout bij het bijwerken van het team",
        description: error.message || "Er is een onverwachte fout opgetreden.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Teamnaam bewerken</DialogTitle>
          <DialogDescription>
            Voer de nieuwe naam in voor het team &quot;{team.name}&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Teamnaam</Label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="bv. Onder 11s"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Annuleren
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Spinner size="small" className="mr-2" />}
            {isLoading ? "Opslaan..." : "Wijzigingen opslaan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
