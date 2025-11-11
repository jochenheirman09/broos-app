'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, doc, getDocs, writeBatch, getDoc, query } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { User, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import type { UserProfile, Team } from '@/lib/types';
import { useUser } from '@/context/user-context';

export default function MigrateUsersPage() {
  const { userProfile } = useUser();
  const db = useFirestore();
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<{ updated: string[]; skipped: string[], errors: string[] } | null>(null);

  const handleMigration = async () => {
    if (!db) return;
    setIsLoading(true);
    setResults(null);

    const batch = writeBatch(db);
    const usersRef = collection(db, 'users');
    const updated: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];
    
    // This query is intentionally broad and may fail if rules are too strict for the admin.
    // It's a temporary tool, so if it fails, rules may need to be temporarily relaxed for the admin UID.
    const usersSnapshot = await getDocs(usersRef);

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data() as UserProfile;

      // We only care about users who have a teamId but are missing a clubId
      if (user.teamId && !user.clubId) {
        try {
          // This is inefficient but necessary for a one-time migration.
          // We must query the collection group to find the team without knowing the club.
          const teamsQuery = query(collection(db, `clubs/${userProfile?.clubId}/teams`));
          const teamsSnapshot = await getDocs(teamsQuery);
          const teamDoc = teamsSnapshot.docs.find(d => d.id === user.teamId);

          if (teamDoc && teamDoc.exists()) {
            const teamData = teamDoc.data() as Team;
            if (teamData.clubId) {
              const userToUpdateRef = doc(db, 'users', userDoc.id);
              batch.update(userToUpdateRef, { clubId: teamData.clubId });
              updated.push(`Updated ${user.email}: set clubId to ${teamData.clubId}`);
            } else {
              errors.push(`Team ${user.teamId} for user ${user.email} is missing a clubId itself.`);
            }
          } else {
            errors.push(`Could not find team with ID ${user.teamId} for user ${user.email}.`);
          }
        } catch (e: any) {
            errors.push(`Error processing ${user.email}: ${e.message}`);
        }
      } else {
        skipped.push(`Skipped ${user.email}: No action needed.`);
      }
    }

    try {
      await batch.commit();
      setResults({ updated, skipped, errors });
    } catch (e: any) {
      errors.push(`BATCH COMMIT FAILED: ${e.message}`);
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
              Klik op de knop hieronder om de migratie te starten. Het proces scant alle gebruikers en voegt
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
                    {/* Optionally list skipped users if needed for debugging */}
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
