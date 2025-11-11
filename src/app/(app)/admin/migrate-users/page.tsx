
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
  DocumentData
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
import { CheckCircle, ServerCrash, RefreshCw, Users } from "lucide-react";
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
      // De enige toegestane query is om alle gebruikers binnen de club op te halen.
      const usersInClubQuery = query(collection(db, "users"), where("clubId", "==", userProfile.clubId));
      const usersSnapshot = await getDocs(usersInClubQuery);
      const allUsersInClub = usersSnapshot.docs.map(d => ({...d.data(), id: d.id} as WithId<UserProfile>));
      
      const batch = writeBatch(db);
      const updatedNames: string[] = [];
      const skippedNames: string[] = [];
      let updatesNeeded = 0;

      // Nu doorlopen we de opgehaalde gebruikers in de code.
      for (const user of allUsersInClub) {
        let needsUpdate = false;
        const updates: Partial<UserProfile> = {};

        // Controle 1: Heeft de gebruiker een clubId? (Zou moeten, gezien de query)
        if (!user.clubId) {
          updates.clubId = userProfile.clubId;
          needsUpdate = true;
        }

        // Andere controles kunnen hier worden toegevoegd, bijv. teamId check.
        // Voor nu focussen we ons op het repareren van het clubId.
        
        if (needsUpdate) {
          const userRef = doc(db, "users", user.id);
          batch.update(userRef, updates);
          updatedNames.push(`${user.name} (ID: ${user.id}) gerepareerd.`);
          updatesNeeded++;
        } else {
          skippedNames.push(`${user.name} (is al correct).`);
        }
      }
      
      if (updatesNeeded > 0) {
        await batch.commit();
      }

      setUpdatedUsers(updatedNames.length > 0 ? updatedNames : ["Geen gebruikers gevonden die een update nodig hebben."]);
      setSkippedUsers(skippedNames);
      setStatus("success");

    } catch (e: any) {
      console.error("Fout tijdens migratie:", e);
      // Verstuur een gedetailleerde foutmelding voor analyse
      const permissionError = new FirestorePermissionError({
          path: 'users',
          operation: 'list',
          requestResourceData: { detail: 'Query failed on `users` collection with a `clubId` where clause.'}
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
            Dit script controleert alle gebruikers binnen uw club en repareert profielen waar nodig (bv. ontbrekend clubId).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <Alert variant="default" className="border-primary/50">
             <Users className="h-4 w-4" />
             <AlertTitle>Hoe het werkt</AlertTitle>
             <AlertDescription>
                Dit script haalt alle gebruikers op die gekoppeld zijn aan uw club en controleert of hun profiel volledig is.
             </AlertDescription>
           </Alert>

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
              <p className="ml-4">Gebruikers controleren...</p>
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
                  {updatedUsers.length > 0 && !updatedUsers[0].startsWith('Geen') ? `${updatedUsers.length} gebruiker(s) succesvol bijgewerkt:` : 'Alle gecontroleerde gebruikers waren al correct.'}
                </p>
                {updatedUsers.length > 0 && !updatedUsers[0].startsWith('Geen') && (
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
                <p>De migratie kon niet worden voltooid. Dit komt waarschijnlijk door een permissiefout in de Firestore-regels.</p>
                 <details className="mt-2 text-xs bg-black/10 p-2 rounded">
                  <summary>Technische Details</summary>
                  <pre className="mt-2 p-2 bg-black/50 text-white rounded-md max-w-full overflow-x-auto whitespace-pre-wrap">
                    {error}
                  </pre>
              </details>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
