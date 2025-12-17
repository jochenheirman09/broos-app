
'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc, collection, collectionGroup, query, where, getDocs, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { useUser } from '@/context/user-context';
import type { UserProfile, Alert as AlertType, WithId, Team } from '@/lib/types';
import { Spinner } from '../ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertTriangle, Archive, Check, Shield, Calendar, MessageSquare, Tag, Users, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '../ui/button';
import { updateAlertStatus } from '@/actions/alert-actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { createOrGetChat } from '@/actions/p2p-chat-actions';
import { cn } from '@/lib/utils';

const getInitials = (name: string = '') => {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase();
};

const alertTypeTranslations: Record<AlertType['alertType'], string> = {
    'Mental Health': 'Mentale Gezondheid',
    'Aggression': 'Agressie',
    'Substance Abuse': 'Middelengebruik',
    'Extreme Negativity': 'Extreme Negativiteit',
};

function AlertCard({ alert, player, team, onStatusChange }: { alert: WithId<AlertType>, player: WithId<UserProfile>, team?: WithId<Team>, onStatusChange: () => void }) {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateStatus = async (status: 'acknowledged' | 'resolved') => {
    if (!user) return;
    setIsUpdating(true);
    const result = await updateAlertStatus(user.uid, alert.clubId, alert.teamId, alert.id, status);
    if (result.success) {
      toast({ title: "Status bijgewerkt", description: result.message });
      onStatusChange();
    } else {
      toast({ variant: "destructive", title: "Fout", description: result.message });
    }
    setIsUpdating(false);
  };
  
  const handleChatWithPlayer = async () => {
    if (!user) return;
    setIsUpdating(true);
    const { chatId, error } = await createOrGetChat([user.uid, player.id]);
    if (chatId) {
      router.push(`/p2p-chat/${chatId}`);
    } else {
      toast({ variant: "destructive", title: "Kon chat niet starten", description: error });
    }
    setIsUpdating(false);
  };

  const translatedType = alertTypeTranslations[alert.alertType] || alert.alertType;
  
  return (
    <AccordionItem value={alert.id}>
      <AccordionTrigger className="p-4 hover:no-underline hover:bg-muted/50 rounded-lg">
        <div className="flex flex-row items-center justify-between w-full gap-x-4">
            <div className="flex items-center gap-4 text-left">
                <Avatar className="h-10 w-10 border-2 border-destructive">
                    <AvatarImage src={player.photoURL} />
                    <AvatarFallback className="bg-destructive/10 text-destructive font-bold">
                        {getInitials(player.name)}
                    </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start gap-1">
                    <p className="font-bold">{player.name}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                        <span>{alert.shareWithStaff ? translatedType : 'Gevoelig onderwerp'}</span>
                        {team && (
                          <>
                            <span className="text-xs">•</span>
                            <span className='flex items-center gap-1'><Users className='h-3 w-3'/> {team.name}</span>
                          </>
                        )}
                    </div>
                     <div className="flex items-center gap-2 text-sm text-muted-foreground sm:hidden">
                        <Calendar className="h-4 w-4" />
                        <span>{format(new Date(alert.date), 'dd MMM yyyy', { locale: nl })}</span>
                    </div>
                </div>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(alert.date), 'dd MMM yyyy', { locale: nl })}</span>
            </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="p-4 bg-muted/20 rounded-b-lg">
        <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className='space-y-3 flex-grow'>
                {alert.topic && (
                    <p className="flex items-start gap-3">
                        <Tag className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                        <span>Onderwerp: <span className="font-semibold">{alert.topic}</span></span>
                    </p>
                )}
                <p className="flex items-start gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  {alert.shareWithStaff ? (
                      <span className="italic">"{alert.triggeringMessage}"</span>
                  ) : (
                      <span className="italic text-muted-foreground">De speler heeft geen toestemming gegeven om de details van dit bericht te delen. Neem op een algemene, ondersteunende manier contact op.</span>
                  )}
                </p>
              </div>
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" disabled={isUpdating} onClick={e => e.stopPropagation()}>
                    {isUpdating ? <Spinner size="small"/> : <MoreVertical className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={handleChatWithPlayer}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Chat met {player.name.split(' ')[0]}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => handleUpdateStatus('acknowledged')}>
                    <Archive className="mr-2 h-4 w-4" />
                    <span>Markeer als Behandeld</span>
                  </DropdownMenuItem>
                   <DropdownMenuItem onSelect={() => handleUpdateStatus('resolved')}>
                    <Check className="mr-2 h-4 w-4" />
                    <span>Markeer als Opgelost</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export function AlertList({ status = 'new', limit }: { status?: 'new' | 'archived', limit?: number }) {
  const { userProfile } = useUser();
  const db = useFirestore();
  const [alerts, setAlerts] = useState<WithId<AlertType>[]>([]);
  const [players, setPlayers] = useState<Map<string, WithId<UserProfile>>>(new Map());
  const [teams, setTeams] = useState<Map<string, WithId<Team>>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleStatusChange = () => setRefreshKey(prev => prev + 1);

  useEffect(() => {
    const fetchAlertsAndPlayers = async () => {
      if (!db || !userProfile?.clubId || !userProfile?.role) {
        setIsLoading(true);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
            const { clubId, teamId, role } = userProfile;
            
            const alertsCollection = collectionGroup(db, 'alerts');

            let alertsQuery;
            if (role === 'responsible') {
                alertsQuery = query(
                    alertsCollection,
                    where('clubId', '==', clubId),
                    orderBy('createdAt', 'desc')
                );
            } else if (role === 'staff' && teamId) {
               alertsQuery = query(
                    alertsCollection,
                    where('clubId', '==', clubId),
                    where('teamId', '==', teamId),
                    orderBy('createdAt', 'desc')
                );
            }
            
            if (!alertsQuery) {
              setAlerts([]);
              setIsLoading(false);
              return;
            }
            
            console.log('[AlertList] Fetching alerts...');
            const alertsSnapshot = await getDocs(alertsQuery);
            console.log(`[AlertList] Found ${alertsSnapshot.docs.length} total alerts.`);
            
            const allAlerts = alertsSnapshot.docs.map(doc => ({ ...doc.data() as AlertType, id: doc.id }));

            // CLIENT-SIDE FILTERING to avoid needing another index
            const filteredAlerts = allAlerts.filter(alert => {
              if (status === 'new') {
                return alert.status === 'new';
              }
              if (status === 'archived') {
                return alert.status === 'acknowledged' || alert.status === 'resolved';
              }
              return true; 
            });

            setAlerts(limit ? filteredAlerts.slice(0, limit) : filteredAlerts);
            
            const userIdsToFetch = [...new Set(filteredAlerts.map(a => a.userId))];
            const teamIdsToFetch = [...new Set(filteredAlerts.map(a => a.teamId))];
            
            const playersMap = new Map<string, WithId<UserProfile>>();
            const teamsMap = new Map<string, WithId<Team>>();

            if (userIdsToFetch.length > 0) {
              console.log('[AlertList] Fetching players directly by ID:', userIdsToFetch);
              const playerPromises = userIdsToFetch.map(uid => getDoc(doc(db, 'users', uid)));
              const playerSnapshots = await Promise.all(playerPromises);

              playerSnapshots.forEach((snapshot) => {
                if (snapshot.exists()) {
                  playersMap.set(snapshot.id, { ...snapshot.data() as UserProfile, id: snapshot.id });
                } else {
                  console.warn(`[AlertList] Player with ID ${snapshot.id} not found in /users/`);
                }
              });
              console.log(`[AlertList] Successfully mapped ${playersMap.size} players.`);
            }

            if (teamIdsToFetch.length > 0 && role === 'responsible') {
                const teamPromises = teamIdsToFetch.map(tid => getDoc(doc(db, `clubs/${clubId}/teams`, tid)));
                const teamSnapshots = await Promise.all(teamPromises);

                teamSnapshots.forEach((snapshot) => {
                    if (snapshot.exists()) {
                        teamsMap.set(snapshot.id, { ...snapshot.data() as Team, id: snapshot.id });
                    }
                });
            }
            
            setPlayers(playersMap);
            setTeams(teamsMap);

      } catch (e: any) {
        console.error("[AlertList] FULL ERROR:", e);
        setError("Fout bij ophalen van alerts: " + e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlertsAndPlayers();

  }, [db, userProfile, limit, status, refreshKey]);

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

  if (alerts.length === 0) {
    return (
      <Alert className="bg-green-500/10 border-green-500/50 text-green-700 dark:text-green-400">
        <Shield className="h-4 w-4 !text-green-500" />
        <AlertTitle>Alles Rustig</AlertTitle>
        <AlertDescription>
          Er zijn momenteel geen {status === 'new' ? 'actieve' : 'gearchiveerde'} alerts.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Accordion type="multiple" className="w-full space-y-2">
      {alerts.map(alert => {
        const player = players.get(alert.userId);
        const team = teams.get(alert.teamId);
        return player ? <AlertCard key={alert.id} alert={alert} player={player} team={team} onStatusChange={handleStatusChange} /> : null;
      })}
    </Accordion>
  );
}
