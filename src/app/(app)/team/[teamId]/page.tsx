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
      <div className="flex items-center gap-2 text-sm font-medium bg-secondary text-secondary-foreground px-3 py-1 rounded-full shadow-clay-inset">
        {roleIcons[member.role]}
        <span className="capitalize">{member.role}</span>
      </div>
    </div>
  );
}

export default function TeamPlayersPage({
  params: { teamId },
}: {
  params: { teamId: string };
}) {
  const { userProfile } = useUser();
  const db = useFirestore();
  const [team, setTeam] = useState<Team | null>(null);
  const [isTeamLoading, setIsTeamLoading] = useState(true);

  const membersQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'users'), where('teamId', '==', teamId));
  }, [db, teamId]);

  const {
    data: members,
    isLoading: areMembersLoading,
    error,
  } = useCollection<UserProfile>(membersQuery);

  useEffect(() => {
    if (!db || !userProfile?.clubId || !teamId) return;

    const fetchTeam = async () => {
      setIsTeamLoading(true);
      const teamRef = doc(db, 'clubs', userProfile.clubId!, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        setTeam(teamSnap.data() as Team);
      } else {
        console.error('Team niet gevonden');
      }
      setIsTeamLoading(false);
    };

    fetchTeam();
  }, [db, userProfile?.clubId, teamId]);

  const isLoading = areMembersLoading || isTeamLoading;

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
            </div>
          )}
          {!isLoading && error && (
            <div className="text-destructive p-4 border border-destructive/50 rounded-lg">
              <p className="font-bold">Fout bij het laden van teamleden</p>
              <p className="text-xs">{error.message}</p>
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
