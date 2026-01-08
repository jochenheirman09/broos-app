
"use client";

import { useFirestore } from "@/firebase";
import { collection, collectionGroup, query, where, getDocs, type Query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useUser } from "@/context/user-context";

interface NotificationBadgeProps {
  type: 'alerts' | 'messages' | 'playerUpdates' | 'staffUpdates' | 'clubUpdates';
  status?: string;
}

export function NotificationBadge({ type, status = 'new' }: NotificationBadgeProps) {
  const { user, userProfile } = useUser();
  const db = useFirestore();
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCount = async () => {
      // Guard Clause: Stop if essential data is missing.
      if (!db || !userProfile?.clubId || !userProfile?.role || !user) {
        console.log(`[Badge-${type}] Skipping fetch: Incomplete user data.`);
        setIsLoading(false);
        return;
      }

      const { clubId, role, teamId, uid } = userProfile;

      try {
        let finalQuery: Query | null = null;

        // Build query based on type AND role.
        if (type === 'alerts') {
          const alertsRef = collectionGroup(db, 'alerts');
          if (role === 'responsible') {
            finalQuery = query(alertsRef, where('clubId', '==', clubId), where('status', '==', status));
          } else if (role === 'staff' && teamId) {
            finalQuery = query(alertsRef, where('clubId', '==', clubId), where('teamId', '==', teamId), where('status', '==', status));
          }
        } else if (type === 'messages') {
          const myChatsRef = collection(db, 'users', uid, 'myChats');
          finalQuery = query(myChatsRef, where(`unreadCounts.${uid}`, '>', 0));
        } else if (type === 'playerUpdates' && role === 'player') {
          finalQuery = query(collection(db, 'users', uid, 'updates'), where('read', '==', false));
        } else if (type === 'staffUpdates') {
          // CRITICAL: Only staff can query for staff updates.
          if (role === 'staff' && teamId) {
            finalQuery = query(collection(db, `clubs/${clubId}/teams/${teamId}/staffUpdates`), where('read', '==', false));
          } else {
             console.log(`[Badge] Skipping staffUpdates query: role '${role}' is not authorized.`);
             // Explicitly do nothing if the role is not staff.
          }
        } else if (type === 'clubUpdates' && role === 'responsible') {
          finalQuery = query(collection(db, `clubs/${clubId}/clubUpdates`), where('read', '==', false));
        }
        
        // Fetch data only if a valid query was built.
        if (finalQuery) {
          const snapshot = await getDocs(finalQuery);
          if (type === 'messages') {
             const totalUnread = snapshot.docs.reduce((total, doc) => {
                const data = doc.data();
                return total + (data.unreadCounts?.[uid] || 0);
            }, 0);
            setCount(totalUnread);
          } else {
             setCount(snapshot.size);
          }
        } else {
            setCount(0); // No query means no count
        }
      } catch (error) {
        console.error(`[Badge Error for type '${type}']:`, error);
        setCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCount();
    
  }, [db, userProfile, user, type, status]);

  if (isLoading || count === 0) {
    return null;
  }

  return (
    <div className="absolute -top-1 -right-1">
      <span className="relative flex h-5 w-5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
        <span className="relative inline-flex rounded-full h-5 w-5 bg-primary text-primary-foreground text-[10px] font-bold items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      </span>
    </div>
  );
}
