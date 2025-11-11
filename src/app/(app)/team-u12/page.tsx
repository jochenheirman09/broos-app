'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, getDocs } from 'firebase/firestore';
import type { UserProfile, WithId } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, HelpCircle, Database, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useUser } from '@/context/user-context';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

function UserCard({ user }: { user: WithId<UserProfile> }) {
  return (
    <div className="flex items-center justify-between p-4 border-b last:border-b-0">
      <div className="flex items-center gap-4">
        <Database className="h-6 w-6 text-primary" />
        <div>
          <p className="font-bold">{user.name}</p>
          <p className="text-sm text-muted-foreground font-mono">{user.email}</p>
        </div>
      </div>
       <div className="text-sm font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full capitalize">
          {user.role}
       </div>
    </div>
  );
}

function ErrorDisplay({ error }: { error: string }) {
    return (
        <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Query Mislukt: Onvoldoende Rechten</AlertTitle>
            <AlertDescription>
                <p>De query om alle gebruikers op te halen is mislukt. Dit is het **verwachte en correcte gedrag** van uw beveiligingsregels.</p>
                <p className="mt-2 text-xs">Uw `firestore.rules` staan niet toe dat de volledige `users` collectie wordt opgevraagd zonder een specifiek filter (zoals `where('clubId', '==', ...)`). Dit is een cruciale beveiligingsmaatregel om de data van al uw gebruikers te beschermen.</p>
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
  const [users, setUsers] = useState<WithId<UserProfile>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isUserLoading || !db || !userProfile) {
      return;
    }
    
    const fetchAllUsers = async () => {
      setIsLoading(true);
      setError(null);
      setUsers([]);

      try {
        console.log("Query Stap 1: Poging om ALLE gebruikers op te halen (dit zou moeten mislukken)...");
        const usersQuery = query(collection(db, 'users'));
        const usersSnapshot = await getDocs(usersQuery);

        // Dit deel van de code zal waarschijnlijk nooit bereikt worden
        const usersData = usersSnapshot.docs.map(doc => ({
            ...(doc.data() as UserProfile),
            id: doc.id
        }));
        console.log(`Query succesvol! ${usersData.length} gebruikers gevonden.`);
        setUsers(usersData);
        
      } catch (e: any) {
        console.error("Fout bij het uitvoeren van de query (verwacht gedrag):", e);
        const errorMessage = e.message || "Onbekende fout";
        
        // Specifiek voor permissiefouten, maak een gedetailleerde error
        if (e.code === 'permission-denied' || e.message.includes('permission-denied') || e.message.includes('insufficient permissions')) {
            const permissionError = new FirestorePermissionError({
                path: `users`,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            setError(`Permissiefout: ${permissionError.message}. Dit is correct, de beveiligingsregels blokkeren het opvragen van alle gebruikers.`);
        } else {
            setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllUsers();
  }, [db, userProfile, isUserLoading]);

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Database className="h-6 w-6 mr-3 text-primary"/>
            Database Query: Alle Geregistreerde Gebruikers
          </CardTitle>
          <CardDescription>
            Deze pagina probeert **alle** gebruikers uit de `users` collectie op te halen. Deze actie moet worden geblokkeerd door de Firestore-beveiligingsregels, wat resulteert in een (correcte) permissiefout.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center h-64 gap-4">
              <Spinner />
              <p className="text-muted-foreground">Query op alle gebruikers wordt uitgevoerd...</p>
            </div>
          )}
          {error && !isLoading && (
            <ErrorDisplay error={error} />
          )}
          {!isLoading && !error && (
            <div className="border rounded-lg">
                <Alert variant="default" className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
                    <ShieldCheck className="h-4 w-4 !text-green-500" />
                    <AlertTitle>Query Onverwacht Geslaagd</AlertTitle>
                    <AlertDescription>
                        De query om alle gebruikers op te halen is onverwacht geslaagd. Dit duidt op te open `firestore.rules`. Het wordt sterk aangeraden om uw regels te controleren en te beperken wie alle gebruikers mag zien.
                    </AlertDescription>
                </Alert>
                {users.length > 0 ? (
                    users.map((user) => (
                        <UserCard key={user.id} user={user} />
                    ))
                ) : (
                    <div className="h-40 flex items-center justify-center text-center">
                       <div>
                         <HelpCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                         <p className="font-bold">Query geslaagd, maar geen resultaten</p>
                         <p className="text-muted-foreground">Er zijn geen gebruikers gevonden.</p>
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
