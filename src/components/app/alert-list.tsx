
'use client';

import { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collectionGroup, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useUser } from '@/context/user-context';
import type { UserProfile, Alert as AlertType, WithId } from '@/lib/types';
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
    if (userLoading) {
      return;
    }
    
    if (!db || !userProfile) {
      setIsLoading(false);
      return;
    }

    const fetchAlertsAndPlayers = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const clubId = userProfile.clubId;
        const teamId = userProfile.teamId;

        if (!clubId) {
            setAlerts([]);
            setIsLoading(false);
            return;
        }

        let alertsQuery;
        if (userProfile.role === 'responsible') {
           alertsQuery = query(
            collectionGroup(db, 'alerts'), 
            where('clubId', '==', clubId),
            orderBy('createdAt', 'desc')
          );
        } else if (userProfile.role === 'staff' && teamId) {
           alertsQuery = query(
            collectionGroup(db, 'alerts'), 
            where('clubId', '==', clubId),
            where('teamId', '==', teamId)
          );
        } else {
          setAlerts([]);
          setIsLoading(false);
          return;
        }


        const alertsSnapshot = await getDocs(alertsQuery).catch(e => {
            const permissionError = new FirestorePermissionError({
                path: `alerts (collection group query for club ${clubId})`,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
            throw permissionError;
        });
        
        let allAlerts = alertsSnapshot.docs.map(doc => ({ ...doc.data() as AlertType, id: doc.id }));
        
        const finalAlerts = limit ? allAlerts.slice(0, limit) : allAlerts;
        setAlerts(finalAlerts);
        
        const userIdsToFetch = [...new Set(finalAlerts.map(a => a.userId))];
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

      } catch (e: any) {
        setError("Kon de alerts niet ophalen. Dit is waarschijnlijk een permissieprobleem. Controleer de Firestore-regels.");
      } finally {
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
