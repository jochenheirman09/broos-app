
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
import { AlertCircle, TestTube2, User as UserIcon, Shield } from 'lucide-react';
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

export default function TeamU12Page() {
  const db = useFirestore();
  const { userProfile, loading: isUserLoading } = useUser();
  const [members, setMembers] = useState<WithId<UserProfile>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isUserLoading || !db) {
      return;
    }

    const fetchTeamMembers = async () => {
      setIsLoading(true);
      setError(null);
      setMembers([]);

      const clubName = "SK Beveren";
      const teamName = "U12";

      try {
        // Stap 1: Vind de club ID voor "SK Beveren"
        console.log(`Zoeken naar club '${clubName}'...`);
        const clubsRef = collection(db, 'clubs');
        const clubsQuery = query(clubsRef, where('name', '==', clubName));
        const clubSnapshot = await getDocs(clubsQuery);

        if (clubSnapshot.empty) {
          throw new Error(`Club '${clubName}' niet gevonden.`);
        }
        const clubId = clubSnapshot.docs[0].id;
        console.log(`Club '${clubName}' gevonden met ID: ${clubId}`);

        // Stap 2: Vind de team ID voor "U12" binnen de gevonden club
        console.log(`Zoeken naar team '${teamName}' in club '${clubId}'...`);
        const teamsRef = collection(db, 'clubs', clubId, 'teams');
        const teamsQuery = query(teamsRef, where('name', '==', teamName));
        const teamSnapshot = await getDocs(teamsQuery);

        if (teamSnapshot.empty) {
          throw new Error(`Team '${teamName}' niet gevonden in club '${clubName}'.`);
        }
        
        const teamId = teamSnapshot.docs[0].id;
        console.log(`Team '${teamName}' gevonden met ID: ${teamId}`);

        // Stap 3: Haal leden op gebaseerd op de GEVONDEN clubId en teamId
        console.log(`Leden ophalen voor clubId: ${clubId} en teamId: ${teamId}`);
        const membersQuery = query(
            collection(db, 'users'), 
            where('clubId', '==', clubId),
            where('teamId', '==', teamId)
        );
        const membersSnapshot = await getDocs(membersQuery);

        if (membersSnapshot.empty) {
          console.log(`Geen leden gevonden voor team ${teamId}.`);
        } else {
            const membersData = membersSnapshot.docs.map(doc => ({
                ...(doc.data() as UserProfile),
                id: doc.id
            }));
            console.log(`Gevonden leden:`, membersData);
            setMembers(membersData);
        }
      } catch (e: any) {
        console.error("Fout bij het ophalen van team U12 data:", e);
        if (e.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: 'users',
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            setError(`Permissiefout: ${permissionError.message}. Controleer de security rules en of de custom claim 'role' correct is ingesteld voor de gebruiker.`);
        } else {
             setError(`Fout: ${e.message}. Controleer de browser console voor de volledige foutmelding.`);
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
            <TestTube2 className="h-6 w-6 mr-3 text-primary"/>
            Testpagina: Leden van SK Beveren - U12
          </CardTitle>
          <CardDescription>
            Dit is een statische pagina om het ophalen van teamleden voor een specifieke club en team te testen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center h-64 gap-4">
              <Spinner />
              <p className="text-muted-foreground">Teamleden worden geladen...</p>
            </div>
          )}
          {error && !isLoading && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Er is een fout opgetreden</AlertTitle>
              <AlertDescription>
                <pre className="whitespace-pre-wrap">{error}</pre>
              </AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && (
            <div className="border rounded-lg">
                {members.length > 0 ? (
                    members.map((member) => (
                        <MemberCard key={member.id} member={member} />
                    ))
                ) : (
                    <div className="h-40 flex items-center justify-center">
                        <p className="text-muted-foreground">Geen leden gevonden voor team 'U12' in club 'SK Beveren'.</p>
                    </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
