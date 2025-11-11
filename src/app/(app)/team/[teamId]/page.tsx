'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, doc, getDoc, getDocs } from 'firebase/firestore';
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
  params: { teamId },
}: {
  params: { teamId: string };
}) {
  const { userProfile } = useUser();
  const db = useFirestore();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<WithId<UserProfile>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait until all necessary data is available before fetching.
    if (!db || !userProfile?.clubId || !teamId) {
      // If we're not ready, we shouldn't attempt to fetch.
      // The initial `isLoading` state will show a spinner.
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      console.log(`[TEAM_PAGE] Starting data fetch for teamId: ${teamId} in club: ${userProfile.clubId}`);
      
      try {
        // --- Step 1: Fetch Team Details (for team name) ---
        const teamRefPath = `clubs/${userProfile.clubId}/teams/${teamId}`;
        console.log(`[TEAM_PAGE] Fetching team document from path: ${teamRefPath}`);
        const teamRef = doc(db, teamRefPath);
        const teamSnap = await getDoc(teamRef);
        
        if (teamSnap.exists()) {
          const teamData = teamSnap.data() as Team;
          console.log(`[TEAM_PAGE] Successfully fetched team data:`, teamData);
          setTeam(teamData);
        } else {
          throw new Error(`Team met ID "${teamId}" niet gevonden in club "${userProfile.clubId}".`);
        }

        // --- Step 2: Fetch Team Members using a correct, filtered query ---
        console.log(`[TEAM_PAGE] Building query for users with teamId: ${teamId}`);
        const membersQuery = query(collection(db, 'users'), where('teamId', '==', teamId));
        const membersSnapshot = await getDocs(membersQuery);
        
        if (membersSnapshot.empty) {
          console.log(`[TEAM_PAGE] Query executed successfully, but no members found for team ${teamId}.`);
        }
        
        const membersData = membersSnapshot.docs.map(doc => ({
          ...doc.data() as UserProfile,
          id: doc.id,
        }));

        console.log(`[TEAM_PAGE] Successfully fetched ${membersData.length} members:`, membersData);
        setMembers(membersData);

      } catch (e: any) {
        console.error("[TEAM_PAGE] CRITICAL_ERROR while fetching team data:", e);
        setError(e.message || "Er is een onbekende fout opgetreden.");
      } finally {
        setIsLoading(false);
        console.log(`[TEAM_PAGE] Data fetching process finished.`);
      }
    };

    fetchData();
  }, [db, userProfile?.clubId, teamId]); // This effect re-runs if any of these dependencies change.


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
          {!isLoading && error && (
             <div className="text-destructive p-4 border border-destructive/50 rounded-lg bg-destructive/10 space-y-3">
              <div className="flex items-center font-bold text-lg">
                <AlertTriangle className="h-6 w-6 mr-3" />
                Fout bij het laden van teamleden
              </div>
              <p className="text-sm">Dit duidt meestal op een permissieprobleem. De beveiligingsregels staan de huidige zoekopdracht niet toe. Controleer de console voor de gedetailleerde foutmelding.</p>
              <details className="mt-2 text-xs bg-black/10 p-2 rounded">
                  <summary>Technische Details</summary>
                  <pre className="mt-2 p-2 bg-black/50 text-white rounded-md max-w-full overflow-x-auto whitespace-pre-wrap">
                    {error}
                  </pre>
              </details>
            </div>
          )}
          {!isLoading && !error && members && members.length > 0 && (
            <div className="border rounded-lg">
              {members.map((member) => (
                <TeamMemberCard key={member.id} member={member} />
              ))}
            </div>
          )}
          {!isLoading && !error && (!members || members.length === 0) && (
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
