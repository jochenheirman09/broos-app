"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { useUser } from "@/context/user-context";
import { collection, query, orderBy, limit } from "firebase/firestore";
import type { PlayerUpdate } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Info, Sparkles, Lightbulb, BrainCircuit } from "lucide-react";

const categoryIcons: { [key: string]: React.ReactNode } = {
  Sleep: <Lightbulb className="h-5 w-5 text-primary" />,
  Nutrition: <BrainCircuit className="h-5 w-5 text-primary" />,
  Motivation: <Sparkles className="h-5 w-5 text-primary" />,
  default: <Info className="h-5 w-5 text-primary" />,
};

export function PlayerUpdates() {
  const { user } = useUser();
  const db = useFirestore();

  const updatesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, `users/${user.uid}/updates`),
      orderBy("date", "desc"),
      limit(5)
    );
  }, [user, db]);

  const {
    data: updates,
    isLoading,
    error,
  } = useCollection<PlayerUpdate>(updatesQuery);

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
    return (
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertTitle>Nog geen weetjes</AlertTitle>
        <AlertDescription>
          Zodra er genoeg data is, verschijnen hier interessante weetjes en vergelijkingen.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
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
