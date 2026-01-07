
"use client";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import type { Query } from "firebase/firestore";
import { useMemo } from "react";
import { useUser } from "@/context/user-context";

interface NotificationBadgeProps {
  query: Query | null;
  countField?: string; // e.g., 'unreadCounts.userId'
}

/**
 * A reusable component to display a notification badge based on a Firestore query.
 * It can either count the number of documents or sum a specific field in the documents.
 */
export function NotificationBadge({ query, countField }: NotificationBadgeProps) {
  const { user } = useUser();
  const { data, isLoading } = useCollection<any>(query);

  const totalCount = useMemo(() => {
    if (isLoading || !data) return 0;

    if (countField && user?.uid) {
      // Sum a specific field, e.g., unreadCounts for the current user
      return data.reduce((total, doc) => {
        // Safely access nested property
        const count = doc[countField.split('.')[0]]?.[user.uid] || 0;
        return total + count;
      }, 0);
    } else {
      // Just count the number of documents
      return data.length;
    }
  }, [data, isLoading, countField, user?.uid]);

  if (totalCount === 0) return null;

  return (
        <div className="absolute top-1 right-1">
            <span className="relative flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-primary text-primary-foreground text-xs items-center justify-center">
                  {totalCount > 9 ? '9+' : totalCount}
                </span>
            </span>
        </div>
    )
}
