
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Trash2, ShieldAlert } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { handleCleanup } from "@/app/actions/cleanup-actions";

export default function CleanupDbPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const onCleanup = async () => {
    setIsLoading(true);
    try {
      const result = await handleCleanup();
      if (result.success) {
        toast({
          title: "Database Opgeruimd!",
          description: result.message,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Opruimen Mislukt",
        description: error.message || "Er is een onbekende fout opgetreden.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-xl mx-auto border-destructive">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-destructive" />
            <div>
              <CardTitle className="text-2xl text-destructive">
                Database Opruimactie
              </CardTitle>
              <CardDescription>
                Deze actie is onomkeerbaar. Gebruik met voorzichtigheid.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-6">
            Klik op de onderstaande knop om alle documenten in de{" "}
            <code className="bg-muted px-1 py-0.5 rounded">users</code> en{" "}
            <code className="bg-muted px-1 py-0.5 rounded">clubs</code>{" "}
            collecties (inclusief alle subcollecties zoals teams, chats, etc.)
            permanent te verwijderen.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full" size="lg">
                <Trash2 className="mr-2 h-5 w-5" />
                Volledige Database Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Weet u het absoluut zeker?</AlertDialogTitle>
                <AlertDialogDescription>
                  U staat op het punt alle gebruikers-, club- en teamgegevens te
                  verwijderen. Deze actie kan niet ongedaan worden gemaakt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isLoading}>
                  Annuleren
                </AlertDialogCancel>
                <AlertDialogAction onClick={onCleanup} disabled={isLoading}>
                  {isLoading && <Spinner size="small" className="mr-2" />}
                  Ja, alles verwijderen
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
