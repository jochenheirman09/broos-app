
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { doc, getDoc, collection, collectionGroup, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useUser } from '@/context/user-context';
import type { UserProfile, Alert as AlertType, WithId, Team } from '@/lib/types';
import { Spinner } from '../ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertTriangle, Archive, Check, Shield, Calendar, MessageSquare, Tag, Users, MoreVertical, ChevronDown, UserX } from 'lucide-react';
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
import { Card } from "@/components/ui/card";


// Helper function to get initials from a name
const getInitials = (name: string = '') => {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase();
};

// Represents alerts grouped under a single player, either anonymously or identified
interface PlayerAlertGroup {
    isAnonymous: boolean;
    player: WithId<UserProfile>;
    alerts: WithId<AlertType>[];
}

// Represents players and their alerts, grouped under a single team
interface TeamAlertGroup {
    team: WithId<Team>;
    players: PlayerAlertGroup[];
}


function SingleAlertDetail({ alert }: { alert: WithId<AlertType> }) {
  const translatedType = alertTypeTranslations[alert.alertType] || alert.alertType;

  return (
    <div className="pl-6 border-l ml-6 my-4 space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>{format(new Date(alert.date), 'dd MMM yyyy, HH:mm', { locale: nl })}</span>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
         <Tag className="h-4 w-4" />
         <span>{alert.shareWithStaff ? translatedType : 'Gevoelig onderwerp'}</span>
      </div>
      <p className="flex items-start gap-2 text-sm">
        <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        {alert.shareWithStaff ? (
            <span className="italic">"{alert.triggeringMessage}"</span>
        ) : (
            <span className="italic text-muted-foreground">De speler heeft geen toestemming gegeven om de details van dit bericht te delen.</span>
        )}
      </p>
    </div>
  );
}


function PlayerAccordion({ playerAlerts, teamId, onStatusChange }: { playerAlerts: PlayerAlertGroup, teamId: string, onStatusChange: () => void }) {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);
  const { player, alerts, isAnonymous } = playerAlerts;

  const displayName = isAnonymous ? "Een speler" : player.name;


  const handleUpdateAllStatus = async (status: 'acknowledged' | 'resolved') => {
    if (!user) return;
    setIsUpdating(true);
    
    // Create a promise for each alert update
    const updatePromises = alerts.map(alert => 
        updateAlertStatus(user.uid, alert.clubId, teamId, alert.id, status)
    );

    // Wait for all updates to complete
    const results = await Promise.all(updatePromises);
    
    const failedUpdates = results.filter(r => !r.success);

    if (failedUpdates.length > 0) {
        toast({ variant: "destructive", title: "Fout", description: `Kon ${failedUpdates.length} alert(s) niet bijwerken.` });
    } else {
        toast({ title: "Status bijgewerkt", description: `Alle alerts voor ${displayName} zijn bijgewerkt.` });
        onStatusChange();
    }
    
    setIsUpdating(false);
  };
  
  const handleChatWithPlayer = async () => {
    if (!user || isAnonymous) return;
    setIsUpdating(true);
    const { chatId, error } = await createOrGetChat([user.uid, player.id]);
    if (chatId) {
      router.push(`/p2p-chat/${chatId}`);
    } else {
      toast({ variant: "destructive", title: "Kon chat niet starten", description: error });
    }
    setIsUpdating(false);
  };
  
  // Use a unique key for the accordion item based on player ID and anonymity status
  const accordionValue = `${player.id}-${isAnonymous}`;

  return (
    <AccordionItem value={accordionValue} className="border-t">
      <div className="flex items-center justify-between p-4 hover:bg-muted/50">
        <AccordionTrigger className="p-0 flex-grow hover:no-underline">
          <div className="flex items-center gap-4 text-left">
             <Avatar className="h-10 w-10">
                {isAnonymous ? (
                    <AvatarFallback className="bg-muted-foreground/10 text-muted-foreground">
                        <UserX className="h-5 w-5" />
                    </AvatarFallback>
                ) : (
                    <>
                    <AvatarImage src={player.photoURL} />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                        {getInitials(player.name)}
                    </AvatarFallback>
                    </>
                )}
            </Avatar>
            <div>
              <p className="font-bold">{displayName}</p>
              <p className="text-sm text-muted-foreground">{alerts.length} {alerts.length > 1 ? 'actieve alerts' : 'actieve alert'}</p>
            </div>
          </div>
        </AccordionTrigger>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" disabled={isUpdating} className="shrink-0">
              {isUpdating ? <Spinner size="small"/> : <MoreVertical className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
             <DropdownMenuItem onSelect={handleChatWithPlayer} disabled={isAnonymous}>
              <MessageSquare className="mr-2 h-4 w-4" />
              <span>Chat met {player.name.split(' ')[0]}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleUpdateAllStatus('acknowledged')}>
              <Archive className="mr-2 h-4 w-4" />
              <span>Markeer alles als Behandeld</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleUpdateAllStatus('resolved')}>
              <Check className="mr-2 h-4 w-4" />
              <span>Markeer alles als Opgelost</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <AccordionContent className="p-4 pt-0 bg-muted/20">
          {alerts.map(alert => <SingleAlertDetail key={alert.id} alert={alert} />)}
      </AccordionContent>
    </AccordionItem>
  )
}

const alertTypeTranslations: Record<AlertType['alertType'], string> = {
    'Mental Health': 'Mentale Gezondheid',
    'Aggression': 'Agressie',
    'Substance Abuse': 'Middelengebruik',
    'Extreme Negativity': 'Extreme Negativiteit',
    'Request for Contact': 'Verzoek om Contact',
};

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
      console.log("[AlertList] useEffect triggered. Status:", {
        dbExists: !!db,
        profileExists: !!userProfile,
        clubId: userProfile?.clubId,
        role: userProfile?.role,
      });

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

            console.log(`[AlertList] Building query for role: ${role}`);

            if (role === 'responsible') {
                alertsQuery = query(
                    alertsCollection,
                    where('clubId', '==', clubId),
                    orderBy('createdAt', 'desc')
                );
                console.log(`[AlertList] Responsible query created for clubId: ${clubId}`);
            } else if (role === 'staff' && teamId) {
               alertsQuery = query(
                    alertsCollection,
                    where('clubId', '==', clubId),
                    where('teamId', '==', teamId),
                    orderBy('createdAt', 'desc')
                );
                console.log(`[AlertList] Staff query created for clubId: ${clubId}, teamId: ${teamId}`);
            }
            
            if (!alertsQuery) {
              console.log("[AlertList] No valid query could be constructed. Aborting fetch.");
              setAlerts([]);
              setIsLoading(false);
              return;
            }
            
            console.log("[AlertList] Executing alerts query...");
            const alertsSnapshot = await getDocs(alertsQuery);
            console.log(`[AlertList] Query executed. Found ${alertsSnapshot.size} total alerts.`);
            
            const allAlerts = alertsSnapshot.docs.map(doc => ({ ...doc.data() as AlertType, id: doc.id }));

            const filteredAlerts = allAlerts.filter(alert => {
              if (status === 'new') return alert.status === 'new';
              if (status === 'archived') return alert.status === 'acknowledged' || alert.status === 'resolved';
              return true; 
            });

            console.log(`[AlertList] Filtered to ${filteredAlerts.length} alerts for status: '${status}'.`);
            setAlerts(limit ? filteredAlerts.slice(0, limit) : filteredAlerts);
            
            const userIdsToFetch = [...new Set(filteredAlerts.map(a => a.userId))];
            const teamIdsToFetch = [...new Set(filteredAlerts.map(a => a.teamId))];
            
            console.log(`[AlertList] Fetching details for ${userIdsToFetch.length} users and ${teamIdsToFetch.length} teams.`);
            const playersMap = new Map<string, WithId<UserProfile>>();
            const teamsMap = new Map<string, WithId<Team>>();

            if (userIdsToFetch.length > 0) {
              const playerPromises = userIdsToFetch.map(uid => getDoc(doc(db, 'users', uid)));
              const playerSnapshots = await Promise.all(playerPromises);

              playerSnapshots.forEach((snapshot) => {
                if (snapshot.exists()) {
                  playersMap.set(snapshot.id, { ...snapshot.data() as UserProfile, id: snapshot.id });
                }
              });
              setPlayers(playersMap);
            }

            if (teamIdsToFetch.length > 0) {
                const teamPromises = teamIdsToFetch.map(tid => getDoc(doc(db, `clubs/${clubId}/teams`, tid)));
                const teamSnapshots = await Promise.all(teamPromises);

                teamSnapshots.forEach((snapshot) => {
                    if (snapshot.exists()) {
                        teamsMap.set(snapshot.id, { ...snapshot.data() as Team, id: snapshot.id });
                    }
                });
                setTeams(teamsMap);
            }
      } catch (e: any) {
        console.error("[AlertList] Detailed Fetch Error:", e);
        setError("Fout bij ophalen van alerts: " + e.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlertsAndPlayers();

  }, [db, userProfile, limit, status, refreshKey]);

  // Grouping logic, runs whenever data changes
  const groupedData: TeamAlertGroup[] = useMemo(() => {
    if (alerts.length === 0 || players.size === 0 || teams.size === 0) {
        return [];
    }

    // Map: teamId -> Map<compositePlayerKey, PlayerAlertGroup>
    const teamPlayerMap = new Map<string, Map<string, PlayerAlertGroup>>();

    for (const alert of alerts) {
        const teamId = alert.teamId;
        const playerId = alert.userId;
        
        // An alert is considered 'identified' if consent is given OR it's a request for contact.
        const isIdentified = !!alert.shareWithStaff || alert.alertType === 'Request for Contact';
        const isAnonymous = !isIdentified;

        // Use a composite key to distinguish between anonymous and identified alerts for the SAME player.
        const compositePlayerKey = `${playerId}-${isAnonymous}`;

        // Ensure team exists in map
        if (!teamPlayerMap.has(teamId)) {
            teamPlayerMap.set(teamId, new Map());
        }
        const playerMap = teamPlayerMap.get(teamId)!;
        
        // Ensure player group (anonymous or identified) exists in map
        if (!playerMap.has(compositePlayerKey)) {
            const playerProfile = players.get(playerId);
            if (playerProfile) {
                playerMap.set(compositePlayerKey, { 
                    player: playerProfile, 
                    alerts: [],
                    isAnonymous: isAnonymous
                });
            }
        }

        // Add alert to the correct player group
        const playerGroup = playerMap.get(compositePlayerKey);
        if (playerGroup) {
            playerGroup.alerts.push(alert);
        }
    }
    
    // Convert maps to sorted arrays for rendering
    return Array.from(teamPlayerMap.entries()).map(([teamId, playerMap]) => {
        const team = teams.get(teamId)!;
        const playerGroups = Array.from(playerMap.values()).sort((a, b) => b.alerts.length - a.alerts.length);
        return { team, players: playerGroups };
    }).sort((a, b) => a.team.name.localeCompare(b.team.name));

}, [alerts, players, teams]);


  if (isLoading) {
    return <div className="flex justify-center items-center h-40"><Spinner /></div>;
  }

  if (error) {
    return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Fout</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }

  if (groupedData.length === 0) {
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
    <Accordion type="multiple" className="w-full space-y-4">
      {groupedData.map(({ team, players: playerGroups }) => (
        <AccordionItem value={team.id} key={team.id} className="border-b-0">
          <Card>
            <AccordionTrigger className="p-4 hover:no-underline rounded-t-lg">
                <div className="flex items-center gap-3">
                    <Users className="h-6 w-6 text-primary"/>
                    <h3 className="text-xl font-bold">{team.name}</h3>
                    <span className="text-muted-foreground font-normal">({playerGroups.reduce((acc, p) => acc + p.alerts.length, 0)} alerts)</span>
                </div>
            </AccordionTrigger>
            <AccordionContent className="p-0">
                <Accordion type="multiple" className="w-full">
                    {playerGroups.map(playerGroup => (
                        <PlayerAccordion key={`${playerGroup.player.id}-${playerGroup.isAnonymous}`} playerAlerts={playerGroup} teamId={team.id} onStatusChange={handleStatusChange} />
                    ))}
                </Accordion>
            </AccordionContent>
          </Card>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
