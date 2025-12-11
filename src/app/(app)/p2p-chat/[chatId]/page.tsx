
'use client';

import { useMemo, use, useState, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc, getDocs, collection, query, where } from 'firebase/firestore';
import type { UserProfile, Conversation, WithId } from '@/lib/types';
import { P2PChatInterface } from '@/components/app/p2p-chat-interface';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User, ShieldX } from 'lucide-react';
import React from 'react';

// A hook to fetch multiple user profiles efficiently using a 'where in' query.
function usePartnerProfiles(userIds: string[] | null) {
  const db = useFirestore();
  const [profiles, setProfiles] = useState<Map<string, WithId<UserProfile>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Create a stable key from the user IDs to use in the useEffect dependency array.
  const userIdsKey = useMemo(() => {
    if (!userIds) return null;
    // Sorting ensures that the key is consistent regardless of participant order.
    return JSON.stringify([...userIds].sort());
  }, [userIds]);

  useEffect(() => {
    const fetchProfiles = async () => {
      // If there's no key, it means there are no user IDs to fetch.
      if (!userIdsKey || userIdsKey === '[]') {
        setProfiles(new Map());
        setIsLoading(false);
        return;
      }
      
      const idsToFetch = JSON.parse(userIdsKey);
      if (idsToFetch.length === 0) {
        setProfiles(new Map());
        setIsLoading(false);
        return;
      }
        
      setIsLoading(true);
      setError(null);
      try {
        const profilesMap = new Map<string, WithId<UserProfile>>();
        // Firestore 'in' query is limited to 30 items. We handle larger groups by chunking.
        for (let i = 0; i < idsToFetch.length; i += 30) {
            const chunk = idsToFetch.slice(i, i + 30);
            // This query triggers the 'list' security rule.
            const q = query(collection(db, 'users'), where('uid', 'in', chunk));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
                profilesMap.set(doc.id, { ...doc.data() as UserProfile, id: doc.id });
            });
        }
        setProfiles(profilesMap);
      } catch (e: any) {
        console.error("Error fetching partner profiles:", e);
        setError(e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfiles();
  }, [userIdsKey, db]); // This effect re-runs only when the list of partners changes.

  return { profiles, isLoading, error };
}


function P2PChatLoader({ chatId }: { chatId: string }) {
  const { user, isUserLoading: userLoading } = useUser();
  const db = useFirestore();

  const chatDocRef = useMemoFirebase(() => {
      if (!chatId) return null;
      return doc(db, 'p2p_chats', chatId);
  }, [chatId, db]);
  const { data: chatData, isLoading: chatLoading, error: chatError } = useDoc<Conversation>(chatDocRef);

  const otherUserIds = useMemo(() => {
    if (!user?.uid || !chatData) return null;
    return chatData.participants.filter(id => id !== user.uid);
  }, [chatData, user?.uid]);

  const { profiles: partnerProfiles, isLoading: profilesLoading, error: profilesError } = usePartnerProfiles(otherUserIds);

  const isLoading = userLoading || chatLoading || profilesLoading;

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Spinner /></div>;
  }
  
  if (chatError || profilesError) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <User className="h-4 w-4" /><AlertTitle>Fout</AlertTitle><AlertDescription>Kon de chatgegevens niet laden.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!chatData || !user || !chatData.participants.includes(user.uid)) {
       return (
            <div className="container mx-auto py-8">
                <Alert variant="destructive">
                <ShieldX className="h-4 w-4" /><AlertTitle>Geen Toegang</AlertTitle><AlertDescription>Je hebt geen toegang tot dit gesprek.</AlertDescription>
                </Alert>
            </div>
        );
  }
  
  // For 1-on-1 chats, we still pass a single 'otherUser' for simplicity in the UI component.
  const otherUser = !chatData.isGroupChat && otherUserIds && partnerProfiles ? partnerProfiles.get(otherUserIds[0]) : undefined;
  
  return <P2PChatInterface chatId={chatId} otherUser={otherUser} chatData={chatData} allPartners={partnerProfiles} />;
}


export default function P2PChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = use(params);
  
  return <P2PChatLoader chatId={chatId} />;
}
