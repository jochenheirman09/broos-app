"use client";

import { useState } from "react";
import { useUser } from "@/context/user-context";
import { useFirestore } from "@/firebase";
import {
  collection,
  query,
  getDocs,
  doc,
  writeBatch,
  getDoc,
  collectionGroup,
} from "firebase/firestore";
import type { UserProfile, WithId, Team } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, RefreshCw, ServerCrash } from "lucide-react";

type MigrationStatus = "idle" | "loading" | "success" | "error";

export default function MigrateUsersPage() {
  const { userProfile, loading: userLoading } = useUser();
  const db = useFirestore();

  const [status, setStatus] = useState<MigrationStatus>("idle");
  const [updatedUsers, setUpdatedUsers] = useState<string[]>([]);
  const [skippedUsers, setSkippedUsers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleMigration = async () => {
    if (!userProfile || !userProfile.clubId || !db) {
      setError("Huidige gebruiker is geen clubverantwoordelijke of heeft geen club.");
      setStatus("error");
      return;
    }
     if (userProfile.role !== 'responsible') {
        setError("Alleen een clubverantwoordelijke kan deze actie uitvoeren.");
        setStatus("error");
        return;
    }


    setStatus("loading");
    setUpdatedUsers([]);
    setSkippedUsers([]);
    setError(null);

    try {
      // Stap 1: Haal ALLE gebruikers op. Dit vereist een specifieke security rule.
      const usersQuery = query(collection(db, "users"));
      const usersSnapshot = await getDocs(usersQuery);
      const allUsers = usersSnapshot.docs.map(
        (d) => ({ ...d.data(), id: d.id } as WithId<UserProfile>)
      );

      const usersToProcess = allUsers.filter(u => !u.clubId && u.teamId);
      const skipped = allUsers.filter(u => !!u.clubId || !u.teamId);
      setSkippedUsers(skipped.map(u => `${u.name} (Reden: ${u.clubId ? 'Heeft al clubId' : 'Geen teamId'})`));


      if (usersToProcess.length === 0) {
        setStatus("success");
        return;
      }
      
      const batch = writeBatch(db);
      const updatedNames: string[] = [];

      for (const user of usersToProcess) {
        if (user.teamId) {
            // Dit is de cruciale stap: we koppelen de gebruiker aan de club van de *huidige* verantwoordelijke.
            // Dit is een aanname die we maken in dit migratiescript.
            const userRef = doc(db, "users", user.id);
            batch.update(userRef, { clubId: userProfile.clubId });
            updatedNames.push(`${user.name} (ID: ${user.id}) gekoppeld aan club ${userProfile.clubId}`);
        }
      }

      await batch.commit();
      setUpdatedUsers(updatedNames);
      setStatus("success");

    } catch (e: any) {
      console.error("Migratiefout:", e);
      if (e.code === 'permission-denied') {
        setError("QUERY MISLUKT: Missing or insufficient permissions. Controleer of de beveiligingsregels correct zijn ingesteld. De 'responsible' rol moet het recht hebben om alle gebruikers te listen.");
      } else {
        setError(e.message || "Er is een onbekende fout opgetreden.");
      }
      setStatus("error");
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-6 w-6" />
            Gebruikersmigratie (Club ID's)
          </CardTitle>
          <CardDescription>
            Dit script haalt alle gebruikers in de database op en voegt de `clubId` van jouw club toe aan gebruikers die wel een `teamId` hebben maar nog geen `clubId`. Voer dit eenmalig uit om bestaande gebruikers te repareren.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Button
            onClick={handleMigration}
            disabled={status === "loading" || userLoading}
            size="lg"
          >
            {status === "loading" ? (
              <Spinner className="mr-2" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {status === "loading"
              ? "Migratie bezig..."
              : "Start Gebruikersmigratie"}
          </Button>

          {status === "loading" && (
            <div className="flex items-center justify-center p-8 text-muted-foreground">
              <Spinner size="large" />
              <p className="ml-4">Alle gebruikers controleren en bijwerken...</p>
            </div>
          )}

          {status === "success" && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">
                Migratie Voltooid!
              </AlertTitle>
              <AlertDescription className="text-green-700">
                <p className="font-bold mb-2">
                  {updatedUsers.length} gebruiker(s) succesvol bijgewerkt:
                </p>
                {updatedUsers.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm">
                    {updatedUsers.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Geen gebruikers gevonden die een update nodig hadden.</p>
                )}
                 <p className="font-bold mt-4 mb-2">
                  {skippedUsers.length} gebruiker(s) overgeslagen:
                </p>
                {skippedUsers.length > 0 && (
                     <ul className="list-disc pl-5 text-sm max-h-40 overflow-y-auto">
                        {skippedUsers.map((name) => (
                        <li key={name}>{name}</li>
                        ))}
                    </ul>
                )}
              </AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <ServerCrash className="h-4 w-4" />
              <AlertTitle>Migratiefout</AlertTitle>
              <AlertDescription>
                <p>De migratie kon niet worden voltooid.</p>
                <pre className="mt-2 p-2 bg-black/10 rounded-md text-xs whitespace-pre-wrap">
                  {error}
                </pre>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
