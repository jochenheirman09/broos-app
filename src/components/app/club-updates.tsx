"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { useUser } from "@/context/user-context";
import { collection, query, orderBy, limit } from "firebase/firestore";
import type { ClubUpdate } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { TrendingUp, BarChart3, Building } from "lucide-react";
import { placeholderClubUpdates } from "@/lib/placeholder-data";

const categoryIcons: { [key: string]: React.ReactNode } = {
  'Club Trends': <TrendingUp className="h-5 w-5 text-primary" />,
  'Team Comparison': <BarChart3 className="h-5 w-5 text-primary" />,
  default: <Building className="h-5 w-5 text-primary" />,
};

export function ClubUpdates({ clubId }: { clubId: string }) {
  const { user } = useUser();
  const db = useFirestore();

  const updatesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, `clubs/${clubId}/clubUpdates`),
      orderBy("date", "desc"),
      limit(5)
    );
  }, [user, db, clubId]);

  const {
    data: updates,
    isLoading,
    error,
  } = useCollection<ClubUpdate>(updatesQuery);

  // Use placeholder data if loading is done and there are no real updates.
  const displayUpdates =
    !isLoading && updates && updates.length > 0
      ? updates
      : placeholderClubUpdates;

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

  if (displayUpdates.length === 0) {
    return (
      <Alert>
        <Building className="h-4 w-4" />
        <AlertTitle>Nog geen club-inzichten</AlertTitle>
        <AlertDescription>
          Zodra er genoeg data van teams beschikbaar is, verschijnen hier club-brede analyses en trends.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {displayUpdates.map((update) => (
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
