"use client";

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