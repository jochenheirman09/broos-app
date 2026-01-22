
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
import { Spinner } from "@/components/ui/spinner";
import { useFirestore } from "@/firebase";
import { deleteTeam } from "@/lib/firebase/firestore/team";

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
        title: "Team Verwijderd",
        description: `Het team "${teamName}" is succesvol verwijderd.`,
      });
      onTeamDeleted();
      setIsOpen(false);
    } catch (error) {
      console.error("Fout bij het verwijderen van het team:", error);
      toast({
        variant: "destructive",
        title: "Fout bij het verwijderen van het team",
        description:
          "Je hebt mogelijk geen toestemming of er is een onverwachte fout opgetreden.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
          <AlertDialogDescription>
            Deze actie kan niet ongedaan worden gemaakt. Dit zal het team{" "}
            <span className="font-semibold">&quot;{teamName}&quot;</span>{" "}
            permanent verwijderen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Annuleren</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Spinner size="small" className="mr-2" />}
            {isLoading ? "Verwijderen..." : "Verwijderen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
