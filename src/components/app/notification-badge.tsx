
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
      // Create a unique ID for this instance for clearer logging
      const logId = `${type}-${Math.random().toString(36).substring(2, 7)}`;
      console.log(`[Badge ${logId}] 🚀 Initializing. Type: ${type}, Status: ${status}`);

      if (!db || !userProfile?.clubId || !user || !userProfile.role) {
        console.log(`[Badge ${logId}] 🛑 Skipping: Missing user data or DB instance.`);
        setIsLoading(false);
        return;
      }

      const { clubId, role, teamId, uid } = userProfile;
      setIsLoading(true);

      try {
        let finalQuery: Query | null = null;
        let queryPath = 'N/A';

        if (type === 'alerts') {
          const alertsRef = collectionGroup(db, 'alerts');
          queryPath = 'collectionGroup(alerts)';
          if (role === 'responsible') {
            finalQuery = query(alertsRef, where('clubId', '==', clubId), where('status', '==', status));
          } else if (role === 'staff' && teamId) {
            finalQuery = query(alertsRef, where('clubId', '==', clubId), where('teamId', '==', teamId), where('status', '==', status));
          }
        } else if (type === 'messages') {
          queryPath = `users/${uid}/myChats`;
          const myChatsRef = collection(db, 'users', uid, 'myChats');
          finalQuery = query(myChatsRef, where(`unreadCounts.${uid}`, '>', 0));
        } else if (type === 'playerUpdates' && role === 'player') {
          queryPath = `users/${uid}/updates`;
          finalQuery = query(collection(db, 'users', uid, 'updates'), where('read', '==', false));
        } else if (type === 'staffUpdates') {
          // This is the key change: handle 'responsible' role for staff updates.
          if (role === 'responsible' && clubId) {
            queryPath = `collectionGroup(staffUpdates) for club ${clubId}`;
            // Query across all teams for the club
            finalQuery = query(collectionGroup(db, 'staffUpdates'), where('clubId', '==', clubId), where('read', '==', false));
          } else if (role === 'staff' && teamId && clubId) {
            queryPath = `clubs/${clubId}/teams/${teamId}/staffUpdates`;
            finalQuery = query(collection(db, `clubs/${clubId}/teams/${teamId}/staffUpdates`), where('read', '==', false));
          }
        } else if (type === 'clubUpdates' && role === 'responsible') {
          queryPath = `clubs/${clubId}/clubUpdates`;
          finalQuery = query(collection(db, `clubs/${clubId}/clubUpdates`), where('read', '==', false));
        }
        
        console.log(`[Badge ${logId}] 🛠️ Built query for path: ${queryPath}`);

        if (finalQuery) {
          const snapshot = await getDocs(finalQuery);
          if (type === 'messages') {
             const totalUnread = snapshot.docs.reduce((total, doc) => {
                const data = doc.data();
                return total + (data.unreadCounts?.[uid] || 0);
            }, 0);
            console.log(`[Badge ${logId}] ✅ Success! Found ${totalUnread} unread messages.`);
            setCount(totalUnread);
          } else {
             console.log(`[Badge ${logId}] ✅ Success! Found ${snapshot.size} documents.`);
             setCount(snapshot.size);
          }
        } else {
            console.log(`[Badge ${logId}] 🤷 No valid query built for role '${role}'. Setting count to 0.`);
            setCount(0);
        }
      } catch (error) {
        console.error(`[Badge ${logId}] 🔥 ERROR fetching count for type '${type}':`, error);
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
