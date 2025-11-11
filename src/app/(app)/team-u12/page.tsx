'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { Team, WithId } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, HelpCircle, Building, Users } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useUser } from '@/context/user-context';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

function TeamCard({ team }: { team: WithId<Team> }) {
  return (
    <div className="flex items-center justify-between p-4 border-b last:border-b-0">
      <div className="flex items-center gap-4">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <p className="font-bold">{team.name}</p>
          <p className="text-sm text-muted-foreground font-mono">{team.id}</p>
        </div>
      </div>
       <div className="text-sm font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
          Team
       </div>
    </div>
  );
}

function ErrorDisplay({ error, isIndexError }: { error: string, isIndexError: boolean }) {
    return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Er is een fout opgetreden</AlertTitle>
            <AlertDescription>
                <p>De query om de teams op te halen is mislukt. Dit komt meestal door beveiligingsregels ('Missing or insufficient permissions').</p>
                <p className="mt-2 text-xs">Uw `firestore.rules` staan waarschijnlijk niet toe dat de ingelogde gebruiker de teams voor deze club mag oplijsten.</p>
                <details className="mt-4 text-xs bg-black/20 p-2 rounded">
                    <summary>Technische Foutdetails</summary>
                    <pre className="whitespace-pre-wrap mt-2">{error}</pre>
                </details>
            </AlertDescription>
        </Alert>
    );
}

export default function TeamU12Page() {
  const db = useFirestore();
  const { userProfile, loading: isUserLoading } = useUser();
  const [teams, setTeams] = useState<WithId<Team>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isUserLoading || !db || !userProfile) {
      return;
    }
    
    const fetchClubTeams = async () => {
      setIsLoading(true);
      setError(null);
      setTeams([]);

      const clubName = "SK Beveren";

      try {
        // Stap 1: Vind de club ID voor "SK Beveren"
        console.log(`Query Stap 1: Club '${clubName}' zoeken...`);
        const clubsRef = collection(db, 'clubs');
        const clubsQuery = query(clubsRef, where('name', '==', clubName));
        const clubSnapshot = await getDocs(clubsQuery);

        if (clubSnapshot.empty) {
          throw new Error(`Club '${clubName}' niet gevonden. Controleer of de club bestaat en de naam correct is gespeld.`);
        }
        
        const clubDoc = clubSnapshot.docs[0];
        const clubId = clubDoc.id;
        console.log(`Club gevonden met ID: ${clubId}`);

        // Stap 2: Haal alle teams op die bij deze club horen
        console.log(`Query Stap 2: Teams ophalen van pad 'clubs/${clubId}/teams'...`);
        const teamsQuery = query(
            collection(db, 'clubs', clubId, 'teams')
        );
        const teamsSnapshot = await getDocs(teamsQuery);

        if (teamsSnapshot.empty) {
          console.log(`Geen teams gevonden voor de query.`);
        } else {
            const teamsData = teamsSnapshot.docs.map(doc => ({
                ...(doc.data() as Team),
                id: doc.id
            }));
            console.log(`Query succesvol! ${teamsData.length} teams gevonden:`, teamsData);
            setTeams(teamsData);
        }
      } catch (e: any) {
        console.error("Fout bij het uitvoeren van de query:", e);
        const errorMessage = e.message || "Onbekende fout";
        setError(errorMessage);
        
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: `clubs/${clubName}/teams`,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            setError(`Permissiefout: ${permissionError.message}. Controleer of uw beveiligingsregels een 'list' operatie op de 'teams' subcollectie toestaan.`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchClubTeams();
  }, [db, userProfile, isUserLoading]);

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Building className="h-6 w-6 mr-3 text-primary"/>
            Database Query: Alle Teams van SK Beveren
          </CardTitle>
          <CardDescription>
            Deze pagina voert een query uit om alle teams te vinden die bij de club 'SK Beveren' horen. Dit test de beveiligingsregels voor subcollecties.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center h-64 gap-4">
              <Spinner />
              <p className="text-muted-foreground">Query wordt uitgevoerd...</p>
            </div>
          )}
          {error && !isLoading && (
            <ErrorDisplay error={error} isIndexError={false} />
          )}
          {!isLoading && !error && (
            <div className="border rounded-lg">
                {teams.length > 0 ? (
                    teams.map((team) => (
                        <TeamCard key={team.id} team={team} />
                    ))
                ) : (
                    <div className="h-40 flex items-center justify-center text-center">
                       <div>
                         <HelpCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                         <p className="font-bold">Query geslaagd, maar geen resultaten</p>
                         <p className="text-muted-foreground">Er zijn geen teams gevonden onder de club 'SK Beveren'.</p>
                       </div>
                    </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
