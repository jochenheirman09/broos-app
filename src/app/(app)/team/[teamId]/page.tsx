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
import { ArrowLeft, Mail, Shield, User as UserIcon, AlertTriangle } from 'lucide-react';
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

export default function TeamMembersPage({
  params,
}: {
  params: { teamId: string };
}) {
  const { teamId } = params;
  const { userProfile } = useUser();
  const db = useFirestore();
  const [team, setTeam] = useState<Team | null>(null);
  const [isTeamLoading, setIsTeamLoading] = useState(true);

  // BREAKPOINT 1: Log initial props and state
  console.log(`[TeamPage] Rendering page for teamId: ${teamId}`);
  console.log(`[TeamPage] User profile loaded:`, userProfile ? 'Yes' : 'No');
  console.log(`[TeamPage] Firestore instance available:`, db ? 'Yes' : 'No');


  // BREAKPOINT 2: Create a specific, constrained query for team members.
  const membersQuery = useMemoFirebase(() => {
    if (!db || !teamId) {
        console.warn('[TeamPage] Cannot create members query: db or teamId is missing.');
        return null;
    }
    console.log(`[TeamPage] Creating members query where 'teamId' == '${teamId}'`);
    return query(collection(db, 'users'), where('teamId', '==', teamId));
  }, [db, teamId]);

  const {
    data: members,
    isLoading: areMembersLoading,
    error: membersError,
  } = useCollection<UserProfile>(membersQuery);

  // BREAKPOINT 3: Log the direct output from the useCollection hook.
  useEffect(() => {
    console.log('[TeamPage] Member data from useCollection:', {
        members,
        areMembersLoading,
        membersError,
    });
  }, [members, areMembersLoading, membersError]);


  // BREAKPOINT 4: Fetch the team document separately for detailed logging.
  useEffect(() => {
    if (!db || !userProfile?.clubId || !teamId) {
      console.warn('[TeamPage] Cannot fetch team document: missing db, clubId, or teamId.');
      setIsTeamLoading(false);
      return;
    }

    const fetchTeam = async () => {
      setIsTeamLoading(true);
      const teamRefPath = `clubs/${userProfile.clubId}/teams/${teamId}`;
      console.log(`[TeamPage] Fetching team document from path: ${teamRefPath}`);
      try {
        const teamRef = doc(db, teamRefPath);
        const teamSnap = await getDoc(teamRef);
        if (teamSnap.exists()) {
          const teamData = teamSnap.data() as Team;
          console.log('[TeamPage] Successfully fetched team document:', teamData);
          setTeam(teamData);
        } else {
          console.error('[TeamPage] Team document NOT found at path:', teamRefPath);
          setTeam(null);
        }
      } catch (e) {
        console.error("[TeamPage] CRITICAL: Error fetching team document:", e);
      } finally {
        setIsTeamLoading(false);
      }
    };

    fetchTeam();
  }, [db, userProfile?.clubId, teamId]);

  const isLoading = areMembersLoading || isTeamLoading;

  // BREAKPOINT 5: Log the final state before rendering.
  console.log('[TeamPage] Final state before render:', { isLoading, members, team, membersError });

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
             <div className="text-destructive p-4 border border-destructive/50 rounded-lg bg-destructive/10 space-y-3">
              <div className="flex items-center font-bold text-lg">
                <AlertTriangle className="h-6 w-6 mr-3" />
                Fout bij het laden van teamleden
              </div>
              <p className="text-sm">Dit duidt op een probleem met de database-query of de beveiligingsregels. Controleer de console voor de gedetailleerde foutmelding van Firestore.</p>
              <details className="mt-2 text-xs bg-black/10 p-2 rounded">
                  <summary>Technische Details</summary>
                  <pre className="mt-2 p-2 bg-black/50 text-white rounded-md max-w-full overflow-x-auto whitespace-pre-wrap">
                    {membersError.message}
                  </pre>
              </details>
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
