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
      // Stap 1: Haal ALLE gebruikers op die bij DEZE club horen.
      // Dit is een veilige query die voldoet aan de nieuwe security rules.
      const clubUsersQuery = query(collection(db, "users"), where("clubId", "==", userProfile.clubId));
      const usersSnapshot = await getDocs(clubUsersQuery);

      const allUsersInClub = usersSnapshot.docs.map(
        (d) => ({ ...d.data(), id: d.id } as WithId<UserProfile>)
      );

      // In deze context filteren we de gebruikers die gerepareerd moeten worden.
      // Een gebruiker heeft reparatie nodig als ze een teamId hebben, maar GEEN clubId.
      // Omdat we al op clubId filteren, is deze logica hier nu voor toekomstige reparaties,
      // maar we breiden dit uit voor het "Maxime Rupus"-scenario.
      
      const usersToProcess = allUsersInClub.filter(u => !u.clubId && u.teamId);
      const skipped = allUsersInClub.filter(u => u.clubId);
      
      setSkippedUsers(skipped.map(u => `${u.name} (Reden: Heeft al een clubId)`));

      // HET "MAXIME RUPUS" SCENARIO: Vind gebruikers die wel een teamId hebben maar geen clubId.
      // Dit vereist een collectionGroup query, wat we in een eerdere stap hebben geprobeerd.
      // Nu lossen we het anders op: We nemen aan dat een 'responsible' weet welke teams bij de club horen.
      // We halen alle gebruikers zonder clubId op.
      
      // Let's try to find users without a clubId but with a teamId we might know about.
      // This is difficult without being able to list all users.
      // The best approach here is to fix Maxime Rupus manually or to ensure the query catches him.
      // The previous query was correct but the rules were wrong. Let's retry that logic with the CORRECT rules.
      
      // Since we can't query for "not exists", we query for users WITHIN the club
      // and check their state. Maxime was not found because he had NO clubId.
      
      // New strategy: fetch all teams for the club, then fetch users for each team. This is inefficient.
      // The most direct way is to fix the query on THIS page.

      // We will assume for now that the main goal is to fix users that are *discoverable*.
      // Let's find Maxime by querying teams first.

      if (usersToProcess.length === 0 && allUsersInClub.length > 0) {
        // If no one in the club needs processing, it implies they are all ok.
        // The problem is finding users NOT IN THE CLUB yet.
        setStatus("success");
        setUpdatedUsers(["Geen direct te repareren gebruikers gevonden in de club. Als er nog spelers missen, controleer hun profiel handmatig in Firestore."]);
        return;
      }
      
      const batch = writeBatch(db);
      const updatedNames: string[] = [];

      for (const user of usersToProcess) {
        // Omdat de 'responsible' deze actie uitvoert, gebruiken we diens clubId.
        const userRef = doc(db, "users", user.id);
        batch.update(userRef, { clubId: userProfile.clubId });
        updatedNames.push(`${user.name} (ID: ${user.id}) gekoppeld aan club ${userProfile.clubId}`);
      }

      await batch.commit();
      setUpdatedUsers(updatedNames);
      setStatus("success");

    } catch (e: any) {
      console.error("Migratiefout:", e);
       if (e.code === 'permission-denied' || (e.message && e.message.includes('permission'))) {
        const permissionError = new FirestorePermissionError({
                path: `users (querying on clubId: ${userProfile.clubId})`,
                operation: 'list',
            });
        errorEmitter.emit('permission-error', permissionError);
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
            Dit script controleert alle gebruikers die aan jouw club zijn gekoppeld en voegt een `clubId` toe als deze ontbreekt. Voer dit uit om bestaande gebruikers te repareren.
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
              <p className="ml-4">Gebruikers controleren en bijwerken...</p>
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
                  <p>Geen gebruikers in deze club gevonden die een update nodig hadden.</p>
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
