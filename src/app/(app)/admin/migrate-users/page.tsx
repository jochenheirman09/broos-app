'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, getDocs, writeBatch, query, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { User, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import type { UserProfile, Team, WithId } from '@/lib/types';
import { useUser } from '@/context/user-context';

export default function MigrateUsersPage() {
  const { userProfile } = useUser();
  const db = useFirestore();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ updated: string[]; skipped: string[], errors: string[] } | null>(null);

  const handleMigration = async () => {
    if (!db || !userProfile?.clubId) {
        alert("Fout: U moet een clubverantwoordelijke zijn met een gekoppelde club.");
        return;
    }
    setIsLoading(true);
    setResults(null);

    const batch = writeBatch(db);
    // FIX: Query only for users within the responsible's club.
    const usersQuery = query(collection(db, 'users'), where('clubId', '==', userProfile.clubId));

    const updated: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];
    
    try {
        const usersSnapshot = await getDocs(usersQuery);

        for (const userDoc of usersSnapshot.docs) {
            const user = { ...userDoc.data() as UserProfile, id: userDoc.id };

            // Scenario 1: User has a teamId but is missing the clubId
            if (user.teamId && !user.clubId) {
                const userToUpdateRef = doc(db, 'users', user.id);
                // The query already ensures the user *should* belong to this club.
                // We're fixing profiles where clubId is missing.
                batch.update(userToUpdateRef, { clubId: userProfile.clubId });
                updated.push(`Gerepareerd: ${user.email} (clubId toegevoegd)`);
            } else if (!user.teamId) {
                 skipped.push(`Overgeslagen: ${user.email} (geen teamId)`);
            } else {
                 skipped.push(`Overgeslagen: ${user.email} (clubId al aanwezig)`);
            }
        }
        
        // Find users with a teamId but NO clubId (older users)
        // This is a less efficient query and might be blocked by rules, 
        // but it's a good fallback for a one-time migration.
        // We will try to fetch ALL users and filter client-side if the specific query fails.
        const allUsersSnapshot = await getDocs(collection(db, 'users'));
        const teamsCache = new Map<string, WithId<Team>>();

        for (const userDoc of allUsersSnapshot.docs) {
             const user = { ...userDoc.data() as UserProfile, id: userDoc.id };
             if (user.teamId && !user.clubId) {
                try {
                    // Try to find the team in the cache first
                    let teamData = teamsCache.get(user.teamId);
                    if (!teamData) {
                        const teamsQuery = query(collection(db, `clubs/${userProfile.clubId}/teams`), where('id', '==', user.teamId));
                        const teamsSnapshot = await getDocs(teamsQuery);
                        const teamDoc = teamsSnapshot.docs[0];

                        if (teamDoc?.exists()) {
                            teamData = { ...teamDoc.data() as Team, id: teamDoc.id };
                            teamsCache.set(user.teamId, teamData);
                        }
                    }
                    
                    if (teamData?.clubId) {
                         const userToUpdateRef = doc(db, 'users', userDoc.id);
                         batch.update(userToUpdateRef, { clubId: teamData.clubId });
                         updated.push(`Gerepareerd: ${user.email} (clubId ${teamData.clubId} toegevoegd)`);
                    } else {
                        errors.push(`Fout: Team ${user.teamId} voor ${user.email} niet gevonden in uw club.`);
                    }
                } catch(e: any) {
                    errors.push(`Verwerkingsfout voor ${user.email}: ${e.message}`);
                }
             }
        }


        await batch.commit();
        setResults({ updated, skipped, errors });

    } catch (e: any) {
      errors.push(`QUERY MISLUKT: ${e.message}. Controleer of u de juiste rechten heeft om gebruikers te zien.`);
      setResults({ updated, skipped, errors });
    } finally {
      setIsLoading(false);
    }
  };
  
   if (userProfile?.role !== 'responsible') {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Geen Toegang</AlertTitle>
          <AlertDescription>
            U moet een 'responsible' zijn om deze pagina te kunnen bekijken.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <RefreshCw className="h-6 w-6 mr-3" />
            Gebruikersmigratie: `clubId` Toevoegen
          </CardTitle>
          <CardDescription>
            Deze tool repareert bestaande gebruikersprofielen door de ontbrekende `clubId` toe te voegen.
            Dit is nodig zodat de beveiligingsregels correct werken. Voer dit één keer uit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Belangrijke instructie</AlertTitle>
            <AlertDescription>
              Klik op de knop hieronder om de migratie te starten. Het proces scant de gebruikers in uw club en voegt
              automatisch de juiste `clubId` toe aan profielen waar dit veld ontbreekt.
            </AlertDescription>
          </Alert>
          <Button onClick={handleMigration} disabled={isLoading} className="w-full" size="lg">
            {isLoading ? <Spinner size="small" className="mr-2" /> : <User className="mr-2 h-4 w-4" />}
            {isLoading ? 'Migratie bezig...' : 'Start Gebruikersmigratie'}
          </Button>

          {results && (
            <Card className="mt-6 bg-muted/50 max-h-96 overflow-y-auto">
              <CardHeader>
                <CardTitle>Migratieresultaten</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm font-mono">
                {results.updated.length > 0 && (
                  <div>
                    <h4 className="font-bold flex items-center gap-2 mb-2 text-green-600"><CheckCircle />Bijgewerkt ({results.updated.length})</h4>
                    <ul className="list-disc pl-5 space-y-1">
                      {results.updated.map((res, i) => <li key={`upd-${i}`}>{res}</li>)}
                    </ul>
                  </div>
                )}
                 {results.errors.length > 0 && (
                  <div>
                    <h4 className="font-bold flex items-center gap-2 mb-2 text-red-600"><AlertCircle />Fouten ({results.errors.length})</h4>
                    <ul className="list-disc pl-5 space-y-1 text-destructive">
                      {results.errors.map((res, i) => <li key={`err-${i}`}>{res}</li>)}
                    </ul>
                  </div>
                )}
                {results.skipped.length > 0 && (
                   <div>
                    <h4 className="font-bold mb-2 text-muted-foreground">Overgeslagen ({results.skipped.length})</h4>
                    <ul className="list-disc pl-5 space-y-1">
                        {results.skipped.map((res, i) => <li key={`skip-${i}`}>{res}</li>)}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
