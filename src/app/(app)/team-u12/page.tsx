
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
    // Explicitly wait until both the user profile and the database instance are available.
    if (isUserLoading || !db || !userProfile?.clubId) {
      // If we are still loading user data, or if the db/clubId is not ready, do nothing yet.
      // The loading state is handled by the main return block.
      if (!isUserLoading) {
        setIsLoading(false);
      }
      return;
    }

    const fetchTeamMembers = async () => {
      setIsLoading(true);
      setError(null);
      setMembers([]);

      try {
        // Stap 1: Vind de team ID voor "U12" binnen de club
        console.log(`Zoeken naar team 'U12' in club '${userProfile.clubId}'...`);
        const teamsRef = collection(db, 'clubs', userProfile.clubId, 'teams');
        const teamsQuery = query(teamsRef, where('name', '==', 'U12'));
        const teamSnapshot = await getDocs(teamsQuery);

        if (teamSnapshot.empty) {
          throw new Error("Team 'U12' niet gevonden in uw club.");
        }
        
        const teamId = teamSnapshot.docs[0].id;
        console.log(`Team 'U12' gevonden met ID: ${teamId}`);

        // Stap 2: Haal leden op gebaseerd op de gevonden team ID
        console.log(`Leden ophalen voor teamId: ${teamId}`);
        const membersQuery = query(collection(db, 'users'), where('teamId', '==', teamId));
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
        setError(`Fout: ${e.message}. Controleer de browser console voor de volledige foutmelding.`);
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
            Testpagina: Leden van Team U12
          </CardTitle>
          <CardDescription>
            Dit is een statische pagina om het ophalen van teamleden te testen.
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
                {error}
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
                        <p className="text-muted-foreground">Geen leden gevonden voor team 'U12'.</p>
                    </div>
                )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
