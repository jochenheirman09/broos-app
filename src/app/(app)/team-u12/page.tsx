
'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, collectionGroup } from 'firebase/firestore';
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
  const { userProfile } = useUser();
  const [teamId, setTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTeamIdLoading, setIsTeamIdLoading] = useState(true);

  // 1. Find the team ID for team "U12" within the current user's club
  useEffect(() => {
    if (!db || !userProfile?.clubId) {
        if (!userProfile) {
            setError("Gebruikersprofiel wordt geladen... Wacht een moment.");
        } else if (!userProfile.clubId) {
            setError("Geen club ID gevonden in uw profiel. Zorg ervoor dat u een 'responsible' gebruiker bent met een club.");
        }
        return;
    };
    
    const findTeamId = async () => {
        setIsTeamIdLoading(true);
        setError(null);
        try {
            console.log(`Searching for team 'U12' in club '${userProfile.clubId}'...`);
            const teamsRef = collection(db, 'clubs', userProfile.clubId, 'teams');
            const teamsQuery = query(teamsRef, where('name', '==', 'U12'));
            const querySnapshot = await getDocs(teamsQuery);

            if (querySnapshot.empty) {
                console.warn("No team found with name 'U12'.");
                setError("Team 'U12' niet gevonden in uw club.");
                setTeamId(null);
            } else {
                const teamDoc = querySnapshot.docs[0];
                console.log(`Found team 'U12' with ID: ${teamDoc.id}`);
                setTeamId(teamDoc.id);
            }
        } catch (e: any) {
            console.error("Error finding team ID for 'U12':", e);
            setError(`Fout bij het zoeken naar team U12: ${e.message}.`);
        } finally {
            setIsTeamIdLoading(false);
        }
    };

    findTeamId();
  }, [db, userProfile]);


  // 2. Once we have the team ID, query for users in that team
  const membersQuery = useMemoFirebase(() => {
    if (!db || !teamId) return null;
    console.log(`Creating query for users where teamId == ${teamId}`);
    return query(collection(db, 'users'), where('teamId', '==', teamId));
  }, [db, teamId]);

  const {
    data: members,
    isLoading: areMembersLoading,
    error: membersError,
  } = useCollection<UserProfile>(membersQuery);
  
  useEffect(() => {
      if (membersError) {
          console.error("Error fetching members:", membersError);
          setError(`Fout bij het ophalen van teamleden: ${membersError.message}. Dit kan duiden op een missende database-index voor de 'users' collectie.`);
      }
  }, [membersError]);


  const isLoading = isTeamIdLoading || areMembersLoading;

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
                <p className="text-xs mt-2">Controleer de browser console voor technische details.</p>
              </AlertDescription>
            </Alert>
          )}
          {!isLoading && !error && members && (
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
