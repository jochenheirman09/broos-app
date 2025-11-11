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
  where,
  getDoc,
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
import { CheckCircle, ServerCrash, RefreshCw } from "lucide-react";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";

type MigrationStatus = "idle" | "loading" | "success" | "error";

export default function MigrateUsersPage() {
  const { userProfile, loading: userLoading } = useUser();
  const db = useFirestore();

  const [status, setStatus] = useState<MigrationStatus>("idle");
  const [updatedUsers, setUpdatedUsers] = useState<string[]>([]);
  const [skippedUsers, setSkippedUsers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleMigration = async () => {
    if (!userProfile || !db || !userProfile.clubId) {
      setError("Huidige gebruiker niet geladen of geen clubId gevonden in profiel.");
      setStatus("error");
      return;
    }
    if (userProfile.role !== "responsible") {
      setError("Alleen een clubverantwoordelijke kan deze actie uitvoeren.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setUpdatedUsers([]);
    setSkippedUsers([]);
    setError(null);

    try {
      // Step 1: Get all teams for the current club.
      const teamsRef = collection(db, `clubs/${userProfile.clubId}/teams`);
      const teamsSnapshot = await getDocs(teamsRef);
      const teamIds = teamsSnapshot.docs.map(doc => doc.id);

      if (teamIds.length === 0) {
        setStatus("success");
        setSkippedUsers(["Geen teams gevonden in uw club. Er zijn geen gebruikers om te migreren."]);
        return;
      }

      // Step 2: For each team, find users that have this teamId but no clubId.
      const usersToUpdate: WithId<UserProfile>[] = [];
      const usersRef = collection(db, "users");
      const CHUNK_SIZE = 10; // Firestore 'in' query limit
      const localSkipped: string[] = [];
      
      for (let i = 0; i < teamIds.length; i += CHUNK_SIZE) {
        const teamIdChunk = teamIds.slice(i, i + CHUNK_SIZE);
        const usersQuery = query(usersRef, where("teamId", "in", teamIdChunk));
        
        try {
            const usersSnapshot = await getDocs(usersQuery);
            usersSnapshot.forEach(userDoc => {
                const userData = { ...userDoc.data(), id: userDoc.id } as WithId<UserProfile>;
                if (!userData.clubId) {
                    usersToUpdate.push(userData);
                } else {
                    localSkipped.push(`${userData.name} (Reden: Heeft al een clubId)`);
                }
            });
        } catch (e: any) {
            // This is where the permission error happens.
            console.error("Fout bij getDocs voor users met teamId in chunk:", e);
            const permissionError = new FirestorePermissionError({
                path: `users (query with where('teamId', 'in', [${teamIdChunk.join(', ')}]))`,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            setError("Permissiefout gedetecteerd. De details worden gelogd.");
            setStatus("error");
            return; // Stop the migration process
        }
      }

      setSkippedUsers(localSkipped);
      
      if (usersToUpdate.length === 0) {
        setStatus("success");
        if (localSkipped.length > 0) {
            setUpdatedUsers(["Geen gebruikers gevonden die een `clubId` missen."]);
        }
        return;
      }
      
      // Step 3: Create a batch write to update all found users.
      const batch = writeBatch(db);
      const updatedNames: string[] = [];

      for (const user of usersToUpdate) {
        const userRef = doc(db, "users", user.id);
        batch.update(userRef, { clubId: userProfile.clubId });
        updatedNames.push(`${user.name} (ID: ${user.id}) gekoppeld aan club ${userProfile.clubId}`);
      }
      
      await batch.commit();

      setUpdatedUsers(updatedNames);
      setStatus("success");

    } catch (e: any) {
      console.error("Algemene migratiefout:", e);
      // This will catch other errors, like the getDocs on the teams collection
      const permissionError = new FirestorePermissionError({
                path: `clubs/${userProfile.clubId}/teams`,
                operation: 'list',
            });
      errorEmitter.emit('permission-error', permissionError);
      setError(e.message || "Er is een onbekende fout opgetreden.");
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
            Dit script vindt alle gebruikers in uw teams die nog geen 'clubId' hebben en voegt deze toe. Voer dit eenmalig uit om bestaande gebruikers te repareren.
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
              <p className="ml-4">Teams doorzoeken en gebruikers bijwerken...</p>
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
                  {updatedUsers.length > 0 ? `${updatedUsers.length} gebruiker(s) succesvol bijgewerkt:` : 'Geen gebruikers te updaten.'}
                </p>
                {updatedUsers.length > 0 && (
                  <ul className="list-disc pl-5 text-sm max-h-40 overflow-y-auto">
                    {updatedUsers.map((name) => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                )}
                 <p className="font-bold mt-4 mb-2">
                  {skippedUsers.length > 0 ? `${skippedUsers.length} gebruiker(s) overgeslagen:` : 'Geen gebruikers overgeslagen.'}
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
