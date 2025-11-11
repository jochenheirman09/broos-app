
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
import { CheckCircle, ServerCrash, RefreshCw, Users, FileWarning } from "lucide-react";
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
      const batch = writeBatch(db);
      const updatedNames: string[] = [];
      const skippedNames: string[] = [];
      let updatesNeeded = 0;

      // Stap 1: Haal alle teams van de club op.
      const teamsRef = collection(db, `clubs/${userProfile.clubId}/teams`);
      const teamsSnapshot = await getDocs(teamsRef);
      const allTeams = teamsSnapshot.docs.map(d => ({...d.data(), id: d.id} as WithId<Team>));

      // Stap 2: Itereer over elk team en zoek gebruikers.
      for (const team of allTeams) {
        const usersInTeamQuery = query(collection(db, "users"), where("teamId", "==", team.id));
        const usersSnapshot = await getDocs(usersInTeamQuery);
        
        for (const userDoc of usersSnapshot.docs) {
          const user = {...userDoc.data(), id: userDoc.id} as WithId<UserProfile>;
          
          // Stap 3: Controleer of de gebruiker gerepareerd moet worden.
          if (user.clubId !== userProfile.clubId) {
            const userRef = doc(db, "users", user.id);
            batch.update(userRef, { clubId: userProfile.clubId });
            updatedNames.push(`${user.name} (Team: ${team.name}) is gekoppeld aan club.`);
            updatesNeeded++;
          } else {
             // Deze gebruiker is al correct. We voegen hem toe aan 'skipped' om verwarring te voorkomen.
             const isAlreadySkipped = skippedNames.some(name => name.startsWith(user.name));
             if (!isAlreadySkipped) {
                skippedNames.push(`${user.name} (is al correct).`);
             }
          }
        }
      }
      
      if (updatesNeeded > 0) {
        await batch.commit();
      }

      setUpdatedUsers(updatedNames);
      setSkippedUsers(skippedNames);
      setStatus("success");

    } catch (e: any) {
      console.error("Fout tijdens migratie:", e);
      let errorMessage = e.message || "Er is een onbekende fout opgetreden.";
      
      // Controleer op een mogelijke permissiefout en maak een gedetailleerde error.
      if (e.code === 'permission-denied' || e.message.includes("permission")) {
          const permissionError = new FirestorePermissionError({
              path: 'users (of teams)',
              operation: 'list',
              requestResourceData: { detail: 'Query failed during migration script execution. This likely involves querying the `teams` or `users` collection.'}
          });
          errorEmitter.emit('permission-error', permissionError);
          // Geef een meer specifieke boodschap
          errorMessage = "Permissiefout: Zorg ervoor dat de beveiligingsregels het opvragen van teams en het opvragen van gebruikers op basis van 'teamId' toestaan.";
      }
      
      setError(errorMessage);
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
            Dit script vindt alle leden van uw teams en zorgt ervoor dat hun profiel correct is gekoppeld aan uw club.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <Alert variant="default" className="border-primary/50">
             <FileWarning className="h-4 w-4" />
             <AlertTitle>Belangrijke Actie</AlertTitle>
             <AlertDescription>
                Voer dit script uit om bestaande gebruikers (zoals spelers die zich hebben aangemeld met een teamcode maar nog geen club-koppeling hebben) te repareren. Dit zorgt ervoor dat ze zichtbaar worden op de teampagina's.
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
                {updatedUsers.length === 0 && skippedUsers.length === 0 && <p>Geen teams gevonden in de club. Voeg eerst teams toe.</p>}
                
                {updatedUsers.length > 0 && (
                  <>
                    <p className="font-bold mb-2">{updatedUsers.length} gebruiker(s) succesvol bijgewerkt:</p>
                    <ul className="list-disc pl-5 text-sm max-h-40 overflow-y-auto">
                      {updatedUsers.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                  </>
                )}

                {updatedUsers.length > 0 && skippedUsers.length > 0 && <div className="my-3" />}

                {skippedUsers.length > 0 && (
                  <>
                    <p className="font-bold mt-4 mb-2">{skippedUsers.length} gebruiker(s) overgeslagen (waren al correct):</p>
                     <ul className="list-disc pl-5 text-sm max-h-40 overflow-y-auto">
                        {skippedUsers.map((name) => (
                          <li key={name}>{name}</li>
                        ))}
                    </ul>
                  </>
                )}
                 {updatedUsers.length === 0 && skippedUsers.length > 0 && <p>Alle gevonden gebruikers waren al correct geconfigureerd.</p>}
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
