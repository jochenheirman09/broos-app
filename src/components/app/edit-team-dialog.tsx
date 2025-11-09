"use client";

import { useState } from "react";
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
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Spinner size="small" className="mr-2" />}
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </change>
  <change>
    <file>/src/components/app/delete-team-dialog.tsx</file>
    <content><![CDATA["use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "../ui/spinner";
import { useFirestore } from "@/firebase";
import { deleteTeam } from "@/lib/team";

interface DeleteTeamDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  clubId: string;
  teamId: string;
  teamName: string;
  onTeamDeleted: () => void;
}

export function DeleteTeamDialog({
  isOpen,
  setIsOpen,
  clubId,
  teamId,
  teamName,
  onTeamDeleted,
}: DeleteTeamDialogProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteTeam({
        db: firestore,
        clubId,
        teamId,
      });
      toast({
        title: "Team Deleted",
        description: `The team "${teamName}" has been successfully deleted.`,
      });
      onTeamDeleted();
      setIsOpen(false);
    } catch (error: any) {
      console.error("Error deleting team:", error);
      toast({
        variant: "destructive",
        title: "Error deleting team",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            team <span className="font-semibold">&quot;{teamName}&quot;</span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Spinner size="small" className="mr-2" />}
            {isLoading ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}