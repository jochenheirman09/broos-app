
'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, collectionGroup, query, where, getDocs, orderBy, limit as firestoreLimit } from 'firebase/firestore';
import { useUser } from '@/context/user-context';
import type { UserProfile, Alert as AlertType, WithId, Team } from '@/lib/types';
import { Spinner } from '../ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertTriangle, Shield, Calendar, MessageSquare, Tag } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


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


export function AlertList({ limit }: { limit?: number }) {
  const { userProfile, loading: userLoading } = useUser();
  const db = useFirestore();
  const [alerts, setAlerts] = useState<WithId<AlertType>[]>([]);
  const [players, setPlayers] = useState<Map<string, WithId<UserProfile>>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // CRITICAL: Wait until the user profile is fully loaded before doing anything.
    if (userLoading) {
      console.log('[AlertList] Effect skipped: user is loading.');
      return;
    }
    
    // CRITICAL: Ensure all necessary data is present before proceeding.
    if (!db || !userProfile) {
      console.log('[AlertList] Effect skipped: profile or db not available. Setting loading to false.');
      setIsLoading(false);
      return;
    }

    const fetchAlertsAndPlayers = async () => {
      console.log(`[AlertList] Starting fetch for user role: ${userProfile.role}`);
      setIsLoading(true);
      setError(null);
      
      try {
        let playerIds: string[] = [];

        // Step 1: Determine which players' alerts to fetch based on role
        if (userProfile.role === 'responsible' && userProfile.clubId) {
            console.log(`[AlertList] Role is 'responsible'. Fetching players for clubId: ${userProfile.clubId}`);
            const playersQuery = query(collection(db, 'users'), where('clubId', '==', userProfile.clubId));
            const playersSnapshot = await getDocs(playersQuery);
            playerIds = playersSnapshot.docs.map(doc => doc.id);
            console.log(`[AlertList] Found ${playerIds.length} players in club.`);

        } else if (userProfile.role === 'staff' && userProfile.teamId) {
            console.log(`[AlertList] Role is 'staff'. Fetching players for teamId: ${userProfile.teamId}`);
            const playersQuery = query(collection(db, 'users'), where('teamId', '==', userProfile.teamId));
            const playersSnapshot = await getDocs(playersQuery);
            playerIds = playersSnapshot.docs.map(doc => doc.id);
            console.log(`[AlertList] Found ${playerIds.length} players in team.`);
        } else {
             console.log("[AlertList] User is not a staff or responsible, or is missing required IDs. Halting alert fetch.");
             setIsLoading(false);
             return;
        }

        if (playerIds.length === 0) {
          console.log('[AlertList] No playerIds found to query alerts for. Exiting fetch.');
          setAlerts([]);
          setIsLoading(false);
          return;
        }

        const allAlerts: WithId<AlertType>[] = [];
        
        console.log('[AlertList] Fetching alerts in chunks of 30 playerIds...');
        // Step 2: Fetch alerts in chunks of 30 playerIds (Firestore 'in' query limit)
        for (let i = 0; i < playerIds.length; i += 30) {
            const chunk = playerIds.slice(i, i + 30);
            console.log(`[AlertList] Querying alerts for playerIds chunk ${Math.floor(i / 30) + 1}:`, chunk);
            
            const alertsQueryConstraints = [
                where('userId', 'in', chunk),
                orderBy('createdAt', 'desc'),
            ];
            // Apply limit only if specified, as applying it per chunk would be incorrect.
            // A client-side slice will be used later if a limit is needed.
            
            const alertsQuery = query(collectionGroup(db, 'alerts'), ...alertsQueryConstraints);
            const alertsSnapshot = await getDocs(alertsQuery);
            const fetchedAlerts = alertsSnapshot.docs.map(doc => ({ ...doc.data() as AlertType, id: doc.id }));
            console.log(`[AlertList] Found ${fetchedAlerts.length} alerts in this chunk.`);
            allAlerts.push(...fetchedAlerts);
        }
        
        // Step 3: Sort combined alerts by date client-side because we fetched in chunks
        console.log(`[AlertList] Total alerts found: ${allAlerts.length}. Sorting...`);
        allAlerts.sort((a, b) => ((b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)));
        const finalAlerts = limit ? allAlerts.slice(0, limit) : allAlerts;
        setAlerts(finalAlerts);
        console.log(`[AlertList] Final alerts count after limit: ${finalAlerts.length}`);
        
        // Step 4: Fetch unique player profiles for the fetched alerts, if any alerts were found
        const userIdsToFetch = [...new Set(finalAlerts.map(a => a.userId))];
        console.log(`[AlertList] Need to fetch profiles for ${userIdsToFetch.length} unique users.`);
        if (userIdsToFetch.length > 0) {
            const playersMap = new Map<string, WithId<UserProfile>>();
            // Fetch player data in chunks as well
            for (let i = 0; i < userIdsToFetch.length; i += 30) {
                const chunk = userIdsToFetch.slice(i, i + 30);
                console.log(`[AlertList] Fetching player profiles chunk ${Math.floor(i / 30) + 1}:`, chunk);
                // Use 'uid' field as per Firestore rules for listing users.
                const playersQuery = query(collection(db, 'users'), where('uid', 'in', chunk));
                const playersSnapshot = await getDocs(playersQuery);
                playersSnapshot.forEach(doc => {
                    playersMap.set(doc.id, { ...doc.data() as UserProfile, id: doc.id });
                });
            }
             setPlayers(playersMap);
             console.log('[AlertList] Player profiles loaded.');
        } else {
            console.log('[AlertList] No alerts found, no player profiles to fetch.');
        }

      } catch (e: any) {
        console.error("[AlertList] >>> CRITICAL ERROR during fetchAlertsAndPlayers:", e);
        const permissionError = new FirestorePermissionError({
            path: `alerts (collection group)`,
            operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
        setError("Kon de alerts niet ophalen. Dit is waarschijnlijk een permissieprobleem. Controleer de Firestore-regels en de console voor de exacte query die mislukt.");
      } finally {
        console.log('[AlertList] Fetch process finished.');
        setIsLoading(false);
      }
    };

    fetchAlertsAndPlayers();

  }, [userProfile, userLoading, db, limit]);

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
          Er zijn momenteel geen actieve alerts.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Accordion type="multiple" className="w-full space-y-2">
      {alerts.map(alert => {
        const player = players.get(alert.userId);
        return player ? <AlertCard key={alert.id} alert={alert} player={player} /> : null;
      })}
    </Accordion>
  );
}
