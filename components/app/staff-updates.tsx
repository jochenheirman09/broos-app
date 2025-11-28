
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { useUser } from "@/context/user-context";
import { collection, query, orderBy, where, getDocs, collectionGroup } from "firebase/firestore";
import type { StaffUpdate, WithId, Team } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Users, Activity, HeartPulse, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

const categoryIcons: { [key: string]: React.ReactNode } = {
  'Team Performance': <Activity className="h-5 w-5 text-primary" />,
  'Player Wellness': <HeartPulse className="h-5 w-5 text-primary" />,
  'Injury Risk': <Users className="h-5 w-5 text-destructive" />,
  default: <Users className="h-5 w-5 text-primary" />,
};

function TeamUpdates({ teamId, teamName, clubId }: { teamId: string, teamName: string, clubId: string }) {
  const db = useFirestore();

  const updatesQuery = useMemoFirebase(() => {
    return query(
      collection(db, `clubs/${clubId}/teams/${teamId}/staffUpdates`),
      orderBy("date", "desc")
    );
  }, [db, clubId, teamId]);

  const { data: updates, isLoading } = useCollection<StaffUpdate>(updatesQuery);

  if (isLoading) {
    return <div className="p-4"><Spinner size="small" /></div>;
  }

  if (!updates || updates.length === 0) {
    return (
        <div className="mb-6">
            <h3 className="font-bold text-lg mb-2">{teamName}</h3>
            <Alert>
                <AlertTitle>Nog geen inzichten</AlertTitle>
                <AlertDescription>Zodra de wekelijkse analyse is gedraaid, verschijnen hier de inzichten voor dit team.</AlertDescription>
            </Alert>
        </div>
    )
  }

  return (
    <div className="mb-6 last:mb-0">
      <h3 className="font-bold text-lg mb-3">{teamName}</h3>
      <div className="space-y-4">
        {updates.map((update) => (
          <div key={update.id} className="p-4 rounded-xl bg-card/50 flex gap-4 items-start shadow-clay-card">
            <div className="mt-1">
              {categoryIcons[update.category as keyof typeof categoryIcons] || categoryIcons.default}
            </div>
            <div>
              <h4 className="font-bold text-base">{update.title}</h4>
              <p className="text-sm text-muted-foreground">{update.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StaffUpdates({ clubId, teamId }: { clubId: string, teamId?: string }) {
  const { userProfile, loading: userLoading } = useUser();
  const db = useFirestore();
  const [teams, setTeams] = useState<WithId<Team>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userLoading) return;
    if (!userProfile || !db) {
        setIsLoading(false);
        return;
    }

    const fetchTeams = async () => {
        setIsLoading(true);
        setError(null);
        try {
            let teamsQuery;
            if (userProfile.role === 'responsible' && clubId) {
                // Responsible: fetch all teams for the club
                teamsQuery = query(collection(db, `clubs/${clubId}/teams`), orderBy("name"));
            } else if (userProfile.role === 'staff' && teamId && clubId) {
                // Staff: fetch only their own team
                teamsQuery = query(collection(db, `clubs/${clubId}/teams`), where("id", "==", teamId));
            } else {
                 // No relevant role or IDs, do nothing.
                setTeams([]);
                setIsLoading(false);
                return;
            }

            const snapshot = await getDocs(teamsQuery);
            const fetchedTeams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WithId<Team>));
            setTeams(fetchedTeams);
        } catch (e: any) {
            console.error("Error fetching teams for updates:", e);
            setError("Kon de teams niet laden om inzichten op te halen.");
        } finally {
            setIsLoading(false);
        }
    };

    fetchTeams();

  }, [userProfile, userLoading, db, clubId, teamId]);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Fout</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (teams.length === 0) {
      return (
        <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Geen Teams Gevonden</AlertTitle>
            <AlertDescription>
            Er zijn geen teams in deze club, of je hebt geen toegang.
            </AlertDescription>
        </Alert>
      )
  }

  return (
    <div className="space-y-6">
      {teams.map((team) => (
        <TeamUpdates key={team.id} teamId={team.id} teamName={team.name} clubId={clubId} />
      ))}
    </div>
  );
}
