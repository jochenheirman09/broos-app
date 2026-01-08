
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { useUser } from "@/context/user-context";
import { collection, query, orderBy, limit } from "firebase/firestore";
import type { PlayerUpdate } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Info, Sparkles, Lightbulb, BrainCircuit } from "lucide-react";
import { useMemo } from "react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

const categoryIcons: { [key: string]: React.ReactNode } = {
  Sleep: <Lightbulb className="h-5 w-5 text-primary" />,
  Nutrition: <BrainCircuit className="h-5 w-5 text-primary" />,
  Motivation: <Sparkles className="h-5 w-5 text-primary" />,
  Stress: <Info className="h-5 w-5 text-yellow-500" />,
  Wellness: <Sparkles className="h-5 w-5 text-primary" />,
  default: <Info className="h-5 w-5 text-primary" />,
};

export function PlayerUpdates({ status = 'new', showDateInHeader = false }: { status?: 'new' | 'archived', showDateInHeader?: boolean }) {
  const { user } = useUser();
  const db = useFirestore();

  // Guarded query
  const updatesQuery = useMemoFirebase(() => {
    if (!user) return null; // Wait for user
    return query(
      collection(db, `users/${user.uid}/updates`),
      orderBy("date", "desc"),
      limit(status === 'new' ? 5 : 50) 
    );
  }, [user, db, status]);

  const {
    data: allUpdates,
    isLoading,
    error,
  } = useCollection<PlayerUpdate>(updatesQuery);

  const updates = useMemo(() => {
    if (!allUpdates || allUpdates.length === 0) return [];
    if (status === 'archived') return allUpdates;

    // Only show updates from the most recent day on the dashboard
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
          Kon je updates niet laden. Probeer het later opnieuw.
        </AlertDescription>
      </Alert>
    );
  }

  if (!updates || updates.length === 0) {
    const message = status === 'new'
      ? "Zodra er nieuwe weetjes zijn, verschijnen ze hier."
      : "Je hebt nog geen gearchiveerde weetjes.";
    return (
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>Nog geen {status === 'new' ? 'recente' : ''} weetjes</AlertTitle>
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
             {categoryIcons[update.category] || categoryIcons.default}
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
