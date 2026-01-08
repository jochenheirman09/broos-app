
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { useUser } from "@/context/user-context";
import { collection, query, orderBy, limit } from "firebase/firestore";
import type { ClubUpdate } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { TrendingUp, BarChart3, Building } from "lucide-react";
import { useMemo } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const categoryIcons: { [key: string]: React.ReactNode } = {
  'Club Trends': <TrendingUp className="h-5 w-5 text-primary" />,
  'Team Comparison': <BarChart3 className="h-5 w-5 text-primary" />,
  'Resource Suggestion': <Building className="h-5 w-5 text-primary" />,
  default: <Building className="h-5 w-5 text-primary" />,
};

export function ClubUpdates({ clubId, status = 'new', showDateInHeader = false }: { clubId: string, status?: 'new' | 'archived', showDateInHeader?: boolean }) {
  const { user } = useUser();
  const db = useFirestore();

  const updatesQuery = useMemoFirebase(() => {
    if (!user || !clubId) return null;
    return query(
      collection(db, `clubs/${clubId}/clubUpdates`),
      orderBy("date", "desc"),
      limit(status === 'new' ? 5 : 50)
    );
  }, [user, db, clubId, status]);

  const {
    data: allUpdates,
    isLoading,
    error,
  } = useCollection<ClubUpdate>(updatesQuery);

  const updates = useMemo(() => {
    if (!allUpdates || allUpdates.length === 0) return [];
    if (status === 'archived') return allUpdates;

    const latestDate = allUpdates[0].date;
    return allUpdates.filter(update => update.date === latestDate);
  }, [allUpdates, status]);

  const latestUpdateDate = useMemo(() => {
    if (!updates || updates.length === 0) return null;
    return format(new Date(updates[0].date + 'T00:00:00'), 'dd MMM yyyy', { locale: nl });
  }, [updates]);

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
        <AlertDescription>
          Kon de club-updates niet laden. Probeer het later opnieuw.
        </AlertDescription>
      </Alert>
    );
  }

  if (!updates || updates.length === 0) {
     const message = status === 'new'
      ? "Zodra de dagelijkse analyse is uitgevoerd en er team-data is, verschijnen hier de inzichten."
      : "Je hebt nog geen gearchiveerde club-inzichten.";
    return (
      <Alert>
        <Building className="h-4 w-4" />
        <AlertTitle>Nog geen club-inzichten</AlertTitle>
        <AlertDescription>
          {message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
       {showDateInHeader && latestUpdateDate && (
        <p className="text-sm text-muted-foreground">
          Laatst bijgewerkt op: {latestUpdateDate}
        </p>
      )}
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
  );
}
