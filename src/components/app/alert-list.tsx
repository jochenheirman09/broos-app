
'use client';

import { useEffect, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useUser } from '@/context/user-context';
import type { UserProfile, Alert as AlertType, WithId, Team } from '@/lib/types';
import { Spinner } from '../ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertTriangle, Shield, Calendar, MessageSquare, Tag, Users } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// Helper function to get initials from a name
const getInitials = (name: string = '') => {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase();
};

function AlertCard({ alert, player }: { alert: WithId<AlertType>, player: WithId<UserProfile> }) {
  return (
    <AccordionItem value={alert.id}>
      <AccordionTrigger className="p-4 hover:no-underline hover:bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4 text-left">
                <Avatar className="h-10 w-10 border-2 border-destructive">
                    <AvatarImage src={player.photoURL} />
                    <AvatarFallback className="bg-destructive/10 text-destructive font-bold">
                        {getInitials(player.name)}
                    </AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-bold">{player.name}</p>
                    <p className="text-sm text-muted-foreground">{alert.shareWithStaff ? alert.alertType : 'Gevoelig onderwerp'}</p>
                </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground pr-4">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(alert.date), 'dd MMM yyyy', { locale: nl })}</span>
            </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-4 bg-muted/20 rounded-b-lg">
        <div className="space-y-3">
          <p className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
            {alert.shareWithStaff ? (
                <span className="italic">&quot;{alert.triggeringMessage}&quot;</span>
            ) : (
                <span className="italic text-muted-foreground">De speler heeft geen toestemming gegeven om de details van dit bericht te delen. Neem op een algemene, ondersteunende manier contact op.</span>
            )}
          </p>
          <p className="flex items-center gap-3">
            <Tag className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="font-mono text-xs bg-muted px-2 py-1 rounded">{alert.status}</span>
          </p>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

function TeamAlerts({ team, clubId }: { team: WithId<Team>, clubId: string }) {
  const db = useFirestore();
  const teamId = team.id;
  const teamName = team.name;

  const alertsQuery = useMemoFirebase(() => {
    // GUARD CLAUSE: Don't build the query if IDs are missing.
    if (!db || !clubId || !teamId) return null;
    return query(
      collection(db, 'clubs', clubId, 'teams', teamId, 'alerts'),
      orderBy('createdAt', 'desc')
    );
  }, [db, clubId, teamId]); // Add teamId to dependency array

  const { data: alerts, isLoading, error } = useCollection<AlertType>(alertsQuery);
  
  const [players, setPlayers] = useState<Map<string, WithId<UserProfile>>>(new Map());

  useEffect(() => {
    if (!alerts || alerts.length === 0 || !db) return;

    const fetchPlayers = async () => {
        const userIdsToFetch = [...new Set(alerts.map(a => a.userId))];
        if (userIdsToFetch.length > 0) {
            const playersMap = new Map<string, WithId<UserProfile>>();
            for (let i = 0; i < userIdsToFetch.length; i += 30) {
                const chunk = userIdsToFetch.slice(i, i + 30);
                const playersQuery = query(collection(db, 'users'), where('uid', 'in', chunk));
                const playersSnapshot = await getDocs(playersQuery);
                playersSnapshot.forEach(doc => {
                    playersMap.set(doc.id, { ...doc.data() as UserProfile, id: doc.id });
                });
            }
            setPlayers(playersMap);
        }
    };
    fetchPlayers();
  }, [alerts, db]);

  if (isLoading) return <Spinner size="small" />;
  if (error) return <p className="text-destructive text-sm">Kon alerts voor dit team niet laden.</p>;
  if (!alerts || alerts.length === 0) return null;

  return (
      <div className="mb-6 last:mb-0">
        <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Users className="h-5 w-5" /> {teamName}</h3>
        <Accordion type="multiple" className="w-full space-y-2">
            {alerts.map(alert => {
                const player = players.get(alert.userId);
                return player ? <AlertCard key={alert.id} alert={alert} player={player} /> : null;
            })}
        </Accordion>
      </div>
  )
}


export function AlertList() {
  const { userProfile, loading: userLoading } = useUser();
  const db = useFirestore();
  
  const [teams, setTeams] = useState<WithId<Team>[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const teamsQuery = useMemoFirebase(() => {
    if (!userProfile || !db) return null;
    
    if (userProfile.role === 'responsible' && userProfile.clubId) {
        return query(collection(db, 'clubs', userProfile.clubId, 'teams'), orderBy("name"));
    } else if (userProfile.role === 'staff' && userProfile.teamId && userProfile.clubId) {
        return query(collection(db, 'clubs', userProfile.clubId, 'teams'), where('__name__', '==', userProfile.teamId));
    }
    
    return null;
  }, [userProfile, db]);

  const { data: fetchedTeams, isLoading: teamsLoading, error: teamsError } = useCollection<Team>(teamsQuery);
  
  useEffect(() => {
      setIsLoading(userLoading || teamsLoading);
      if (teamsError) {
          setError("Kon de teams niet ophalen om alerts te tonen.");
          console.error("[AlertList] Error fetching teams:", teamsError);
      }
  }, [userLoading, teamsLoading, teamsError]);

  useEffect(() => {
    setTeams(fetchedTeams);
  }, [fetchedTeams]);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Fout</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }

  if (!teams || teams.length === 0) {
    return (
      <Alert className="bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400">
        <Shield className="h-4 w-4 !text-green-500" />
        <AlertTitle>Alles Rustig</AlertTitle>
        <AlertDescription>
          Er zijn momenteel geen actieve alerts voor de teams die jij beheert.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {teams.map(team => (
        <TeamAlerts key={team.id} team={team} clubId={userProfile!.clubId!} />
      ))}
    </div>
  );
}
