
'use client';

import { useState, useEffect, use } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
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
import { getTeamMembers } from '@/actions/user-actions';

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

function TeamMembersPageContents({
  teamId,
}: {
  teamId: string;
}) {
  const { user, userProfile, loading: userLoading } = useUser();
  const db = useFirestore();
  
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<WithId<UserProfile>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userLoading || !user || !userProfile?.clubId) {
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Step 1: Fetch team details to display team name.
        const teamRef = doc(db, `clubs/${userProfile.clubId}/teams/${teamId}`);
        const teamSnap = await getDoc(teamRef);
        
        if (teamSnap.exists()) {
          setTeam(teamSnap.data() as Team);
        } else {
          throw new Error(`Team met ID "${teamId}" niet gevonden in uw club.`);
        }

        // Step 2: Fetch members using the secure server action.
        const membersData = await getTeamMembers(user.uid, teamId);
        setMembers(membersData);

      } catch (e: any) {
        console.error("Fout bij het ophalen van teamgegevens:", e);
        setError(e.message || "Er is een onbekende fout opgetreden bij het laden van de gegevens.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [db, user, userProfile, teamId, userLoading]);


  return (
    <div className="space-y-6">
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
              <p className="text-sm">{error}</p>
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

export default function TeamMembersPage({ params }: { params: { teamId: string } }) {
  return <TeamMembersPageContents teamId={params.teamId} />;
}
