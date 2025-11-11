'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import type { UserProfile, WithId } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, TestTube2, User as UserIcon, Shield, DatabaseZap, HelpCircle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useUser } from '@/context/user-context';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

const roleIcons: { [key: string]: React.ReactNode } = {
  player: <UserIcon className="h-4 w-4" />,
  staff: <Shield className="h-4 w-4" />,
};


function MemberCard({ member }: { member: WithId<UserProfile> }) {
  const getInitials = (name: string = '') => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="flex items-center justify-between p-4 border-b last:border-b-0">
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12">
          <AvatarImage src={member.photoURL} />
          <AvatarFallback className="bg-primary/20 text-primary font-bold">
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-bold">{member.name}</p>
          <p className="text-sm text-muted-foreground">{member.email}</p>
        </div>
      </div>
       {roleIcons[member.role] && (
        <div className="flex items-center gap-2 text-sm font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
          {roleIcons[member.role]}
          <span className="capitalize">{member.role}</span>
        </div>
      )}
    </div>
  );
}

function ErrorDisplay({ error, isIndexError }: { error: string, isIndexError: boolean }) {
    return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Er is een fout opgetreden</AlertTitle>
            <AlertDescription>
                {isIndexError ? (
                    <div>
                        <p className="font-bold mb-2">Een vereiste Firestore-index ontbreekt.</p>
                        <p>Voor deze query, die op zowel 'clubId' als 'teamId' filtert, is een samengestelde index nodig. De foutmelding in de browserconsole bevat een directe link om deze index aan te maken.</p>
                        <p className="mt-2 text-xs">Zoek in de console naar een bericht dat begint met: "The query requires an index..."</p>
                    </div>
                ) : (
                    <p>De query is mislukt. Dit komt meestal door beveiligingsregels ('Missing or insufficient permissions').</p>
                )}
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
  const [members, setMembers] = useState<WithId<UserProfile>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isIndexError, setIsIndexError] = useState(false);

  useEffect(() => {
    if (isUserLoading || !db) {
      return;
    }
    
    // Wacht tot userProfile met de cruciale clubId geladen is.
    if (!userProfile?.clubId) {
        if (!isUserLoading) { // Toon alleen als het laden echt klaar is.
            setError("Gebruikersprofiel is niet volledig geladen of bevat geen club ID. Kan de query niet uitvoeren.");
            setIsLoading(false);
        }
        return;
    }

    const fetchTeamMembers = async () => {
      setIsLoading(true);
      setError(null);
      setIsIndexError(false);
      setMembers([]);

      const clubName = "SK Beveren";
      const teamName = "U12";

      try {
        // We gebruiken nu de clubId van de ingelogde gebruiker, dit is veel robuuster.
        const clubId = userProfile.clubId;
        console.log(`Query Stap 1: Club ID '${clubId}' gebruiken van ingelogde gebruiker.`);

        // Stap 2: Vind de team ID voor "U12" binnen de gevonden club
        console.log(`Query Stap 2: Team '${teamName}' zoeken in club '${clubId}'...`);
        const teamsRef = collection(db, 'clubs', clubId, 'teams');
        const teamsQuery = query(teamsRef, where('name', '==', teamName));
        const teamSnapshot = await getDocs(teamsQuery);

        if (teamSnapshot.empty) {
          throw new Error(`Team '${teamName}' niet gevonden in club '${clubName}'. Controleer of het team bestaat en de naam correct is gespeld.`);
        }
        
        const teamId = teamSnapshot.docs[0].id;
        console.log(`Team gevonden met ID: ${teamId}`);

        // Stap 3: Haal leden op met een samengestelde query die nu voldoet aan de security rules
        console.log(`Query Stap 3: Leden ophalen met clubId='${clubId}' EN teamId='${teamId}'...`);
        const membersQuery = query(
            collection(db, 'users'), 
            where('clubId', '==', clubId), // <-- Essentiële toevoeging om te voldoen aan de regel
            where('teamId', '==', teamId)
        );
        const membersSnapshot = await getDocs(membersQuery);

        if (membersSnapshot.empty) {
          console.log(`Geen leden gevonden voor de query.`);
        } else {
            const membersData = membersSnapshot.docs.map(doc => ({
                ...(doc.data() as UserProfile),
                id: doc.id
            }));
            console.log(`Query succesvol! ${membersData.length} leden gevonden:`, membersData);
            setMembers(membersData);
        }
      } catch (e: any) {
        console.error("Fout bij het uitvoeren van de query:", e);
        const errorMessage = e.message || "Onbekende fout";
        setError(errorMessage);

        if (errorMessage.toLowerCase().includes("index")) {
            setIsIndexError(true);
        }
        
        // Specifieke error voor permissies
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: 'users',
                operation: 'list',
                requestResourceData: {
                  query: {
                    clubId: userProfile.clubId,
                    teamName: teamName
                  }
                }
            });
            errorEmitter.emit('permission-error', permissionError);
            setError(`Permissiefout: ${permissionError.message}. Controleer of de beveiligingsregels een query met 'clubId' en 'teamId' toestaan, en of de benodigde Firestore index is aangemaakt.`);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamMembers();
  }, [db, userProfile, isUserLoading]);

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <DatabaseZap className="h-6 w-6 mr-3 text-primary"/>
            Database Query: Leden van SK Beveren - U12
          </CardTitle>
          <CardDescription>
            Deze pagina voert een samengestelde query uit om teamleden te vinden. Dit test de beveiligingsregels en vereist mogelijk een Firestore-index.
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
            <ErrorDisplay error={error} isIndexError={isIndexError} />
          )}
          {!isLoading && !error && (
            <div className="border rounded-lg">
                {members.length > 0 ? (
                    members.map((member) => (
                        <MemberCard key={member.id} member={member} />
                    ))
                ) : (
                    <div className="h-40 flex items-center justify-center text-center">
                       <div>
                         <HelpCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                         <p className="font-bold">Query geslaagd, maar geen resultaten</p>
                         <p className="text-muted-foreground">Er zijn geen gebruikersdocumenten gevonden die voldoen aan<br/> `clubId` == '{userProfile?.clubId}' AND `teamId` == 'team-id-voor-u12'.</p>
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
