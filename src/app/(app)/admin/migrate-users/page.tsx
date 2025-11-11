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
import { CheckCircle, ServerCrash, RefreshCw, Users, ShieldAlert, FileWarning } from "lucide-react";
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

    const usersToUpdate = new Map<string, WithId<UserProfile>>();
    const localSkipped: string[] = [];

    try {
      // Step 1: Query all users that are already correctly associated with the club
      // This is a permitted query based on the new security rules.
      const usersInClubQuery = query(collection(db, "users"), where("clubId", "==", userProfile.clubId));
      const usersInClubSnapshot = await getDocs(usersInClubQuery);
      
      usersInClubSnapshot.forEach(userDoc => {
          const userData = { ...userDoc.data(), id: userDoc.id } as WithId<UserProfile>;
          // This user is already correct, so we can potentially skip them, but we add them
          // to our map to have a full list of club members.
          if (!usersToUpdate.has(userData.id)) {
             usersToUpdate.set(userData.id, userData);
             localSkipped.push(`${userData.name} (Reden: Heeft al het correcte clubId)`);
          }
      });
      
      // Step 2: Separately query for users in each team of the club.
      // This will find users who have a teamId but might be missing a clubId.
      const teamsRef = collection(db, `clubs/${userProfile.clubId}/teams`);
      const teamsSnapshot = await getDocs(teamsRef);
      const teamsInClub = teamsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithId<Team>));
      
      for (const team of teamsInClub) {
        const usersInTeamQuery = query(collection(db, "users"), where("teamId", "==", team.id));
        const usersInTeamSnapshot = await getDocs(usersInTeamQuery);

        usersInTeamSnapshot.forEach(userDoc => {
            const userData = { ...userDoc.data(), id: userDoc.id } as WithId<UserProfile>;
            // If the user doesn't have the correct clubId, they need an update.
            // We add them to our map. If they are already in the map, this will just overwrite, which is fine.
             if (!userData.clubId || userData.clubId !== userProfile.clubId) {
                usersToUpdate.set(userData.id, userData);
            }
        });
      }

      setSkippedUsers(localSkipped);
      
      const batch = writeBatch(db);
      const updatedNames: string[] = [];
      let updateNeeded = false;

      // Final Step: Iterate through the collected map and update where necessary.
      for (const user of usersToUpdate.values()) {
        if (!user.clubId || user.clubId !== userProfile.clubId) {
          const userRef = doc(db, "users", user.id);
          batch.update(userRef, { clubId: userProfile.clubId });
          updatedNames.push(`${user.name} (ID: ${user.id}) gekoppeld aan club ${userProfile.clubId}`);
          updateNeeded = true;
        }
      }
      
      if (!updateNeeded) {
        setStatus("success");
        setUpdatedUsers(["Geen gebruikers gevonden die een `clubId` missen."]);
        return;
      }
      
      await batch.commit();

      setUpdatedUsers(updatedNames);
      setStatus("success");

    } catch (e: any) {
      console.error("Fout tijdens migratie:", e);
      // Emit a contextual error if it's a permission issue.
      if (e.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: 'users',
            operation: 'list',
            requestResourceData: { detail: 'Query failed, likely on teamId or clubId lookup.'}
        });
        errorEmitter.emit('permission-error', permissionError);
      }
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
           <Alert variant="default" className="border-primary/50">
             <Users className="h-4 w-4" />
             <AlertTitle>Hoe het werkt</AlertTitle>
             <AlertDescription>
                Dit script haalt eerst alle teams in uw club op. Vervolgens zoekt het per team naar leden. Voor elk lid wordt gecontroleerd of de `clubId` ontbreekt of incorrect is, en wordt deze indien nodig gerepareerd.
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
                  {updatedUsers.length > 0 && !updatedUsers[0].startsWith('Geen') ? `${updatedUsers.length} gebruiker(s) succesvol bijgewerkt:` : 'Alle gebruikers zijn al correct geconfigureerd.'}
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
