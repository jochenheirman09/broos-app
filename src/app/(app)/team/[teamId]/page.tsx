'use client';

import { useState, useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDoc } from 'firebase/firestore';
import { useUser } from '@/context/user-context';
import type { UserProfile, Team, WithId } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mail, Shield, User as UserIcon } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';

const roleIcons: { [key: string]: React.ReactNode } = {
  player: <UserIcon className="h-4 w-4" />,
  staff: <Shield className="h-4 w-4" />,
};

function TeamMemberCard({ member }: { member: WithId<UserProfile> }) {
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
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Mail className="h-3 w-3" />
            {member.email}
          </p>
        </div>
      </div>
      {roleIcons[member.role] && (
        <div className="flex items-center gap-2 text-sm font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full shadow-clay-inset">
          {roleIcons[member.role]}
          <span className="capitalize">{member.role}</span>
        </div>
      )}
    </div>
  );
}

export default function TeamPlayersPage({
  params,
}: {
  params: { teamId: string };
}) {
  const { teamId } = params;
  console.log('[TeamPage] 1. Rendering with teamId:', teamId);

  const { userProfile } = useUser();
  const db = useFirestore();
  const [team, setTeam] = useState<Team | null>(null);
  const [isTeamLoading, setIsTeamLoading] = useState(true);

  console.log('[TeamPage] 2. Firebase DB and UserProfile status:', {
    db: !!db,
    userProfile: !!userProfile,
  });

  const membersQuery = useMemoFirebase(() => {
    console.log('[TeamPage] 3. useMemoFirebase for membersQuery running.');
    if (!db || !teamId) {
      console.log('[TeamPage] 3a. Aborting query creation: db or teamId is missing.');
      return null;
    }
    console.log(`[TeamPage] 3b. Creating query: users where teamId == ${teamId}`);
    return query(collection(db, 'users'), where('teamId', '==', teamId));
  }, [db, teamId]);

  const {
    data: members,
    isLoading: areMembersLoading,
    error: membersError,
  } = useCollection<UserProfile>(membersQuery);

  console.log('[TeamPage] 4. Result from useCollection hook:', {
    members,
    areMembersLoading,
    membersError,
  });

  useEffect(() => {
    console.log('[TeamPage] 5. useEffect for fetching team document running.');
    if (!db || !userProfile?.clubId || !teamId) {
      console.log('[TeamPage] 5a. Aborting team fetch: missing dependencies.');
      setIsTeamLoading(false);
      return;
    }

    const fetchTeam = async () => {
      setIsTeamLoading(true);
      const teamRefPath = `clubs/${userProfile.clubId}/teams/${teamId}`;
      console.log(`[TeamPage] 5b. Fetching team document from: ${teamRefPath}`);
      try {
        const teamRef = doc(db, teamRefPath);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
          const teamData = teamSnap.data() as Team;
          console.log('[TeamPage] 5c. Team document found:', teamData);
          setTeam(teamData);
        } else {
          console.error('[TeamPage] 5c. Team document NOT found at path:', teamRefPath);
          setTeam(null);
        }
      } catch (e) {
        console.error("[TeamPage] 5d. Error fetching team document:", e);
      } finally {
        setIsTeamLoading(false);
      }
    };

    fetchTeam();
  }, [db, userProfile?.clubId, teamId]);

  const isLoading = areMembersLoading || isTeamLoading;
  console.log('[TeamPage] 6. Final loading state:', { isLoading, areMembersLoading, isTeamLoading });

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center text-2xl">
                Leden van {isLoading ? '...' : team?.name || 'Team'}
              </CardTitle>
              <CardDescription>
                Een overzicht van alle spelers en stafleden in dit team.
              </CardDescription>
            </div>
            <Link href="/dashboard" passHref>
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Terug naar Dashboard
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <Spinner />
              <p className="ml-4 text-muted-foreground">Gegevens laden...</p>
            </div>
          )}
          {!isLoading && membersError && (
             <div className="text-destructive p-4 border border-destructive/50 rounded-lg bg-destructive/10">
              <p className="font-bold">Fout bij het laden van teamleden</p>
              <p className="text-xs mt-2">Dit wordt meestal veroorzaakt doordat de database een index nodig heeft die niet automatisch is aangemaakt, of door een probleem met de beveiligingsregels.</p>
              <pre className="mt-2 p-2 bg-black/50 text-white rounded-md text-xs max-w-full overflow-x-auto whitespace-pre-wrap">
                {membersError.message}
              </pre>
            </div>
          )}
          {!isLoading && !membersError && members && members.length > 0 && (
            <div className="border rounded-lg">
              {members.map((member) => (
                <TeamMemberCard key={member.id} member={member} />
              ))}
            </div>
          )}
          {!isLoading && !membersError && (!members || members.length === 0) && (
            <div className="h-64 border rounded-lg flex items-center justify-center bg-muted/20">
              <p className="text-muted-foreground">
                Er zijn nog geen spelers of stafleden aan dit team gekoppeld.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
