"use client";

import { useUser } from "@/context/user-context";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, where, getDocs } from "firebase/firestore";
import type { Conversation, UserProfile, WithId } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, MessageSquare, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import React, { useState, useEffect } from "react";

const getInitials = (name: string = '') => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
};

function ExistingChatItem({ chat, partnersMap }: { chat: WithId<Conversation>, partnersMap: Map<string, WithId<UserProfile>> }) {
  const { user } = useUser();

  let title = "Gesprek"; // Changed from "Onbekend Gesprek"
  let avatarUrl: string | undefined = undefined;
  let fallback: React.ReactNode = <UserIcon className="h-6 w-6" />;
  
  if (chat.isGroupChat) {
    title = chat.name || "Groepschat";
    fallback = <Users className="h-6 w-6" />;
  } else if (user && chat.participants) {
    const otherParticipantId = chat.participants.find(p => p !== user.uid);
    const partnerProfile = otherParticipantId ? partnersMap.get(otherParticipantId) : null;
    if (partnerProfile) {
        title = partnerProfile.name;
        avatarUrl = partnerProfile.photoURL;
        fallback = <>{getInitials(partnerProfile.name)}</>;
    }
  }

  const timestamp = chat.lastMessageTimestamp?.toDate();
  const timeAgo = timestamp ? formatDistanceToNow(timestamp, { addSuffix: true, locale: nl }) : '';

  return (
    <Link href={`/p2p-chat/${chat.id}`} className="block hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-4 p-4 border-b last:border-b-0">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatarUrl} />
          <AvatarFallback className="bg-primary/20 text-primary font-bold">{fallback}</AvatarFallback>
        </Avatar>
        <div className="flex-grow overflow-hidden">
          <div className="flex justify-between items-start">
             <p className="font-bold truncate">{title}</p>
             <p className="text-xs text-muted-foreground shrink-0 ml-2">{timeAgo}</p>
          </div>
          <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
        </div>
      </div>
    </Link>
  );
}


export function ExistingChatsList() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  
  const [partnersMap, setPartnersMap] = useState<Map<string, WithId<UserProfile>>>(new Map());
  const [partnersLoading, setPartnersLoading] = useState(true);

  const myChatsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, "users", user.uid, "myChats"),
      orderBy("lastMessageTimestamp", "desc")
    );
  }, [user, db]);

  const { data: chats, isLoading: chatsLoading, error } = useCollection<Conversation>(myChatsQuery);
  
  useEffect(() => {
    if (!chats || chats.length === 0) {
        setPartnersLoading(false);
        return;
    };
    
    const fetchPartners = async () => {
        setPartnersLoading(true);
        const allPartnerIds = new Set<string>();
        chats.forEach(chat => {
            if (chat.participants) {
                chat.participants.forEach(pId => {
                    if (pId !== user?.uid) allPartnerIds.add(pId);
                });
            }
        });

        if (allPartnerIds.size === 0) {
            setPartnersLoading(false);
            return;
        }

        const idsToFetch = Array.from(allPartnerIds);
        const newPartnersMap = new Map<string, WithId<UserProfile>>();
        
        try {
             for (let i = 0; i < idsToFetch.length; i += 30) {
                const chunk = idsToFetch.slice(i, i + 30);
                const q = query(collection(db, 'users'), where('uid', 'in', chunk));
                const snapshot = await getDocs(q);
                snapshot.forEach(doc => {
                    newPartnersMap.set(doc.id, { ...doc.data() as UserProfile, id: doc.id });
                });
            }
            setPartnersMap(newPartnersMap);
        } catch (e) {
            console.error("Failed to fetch partner profiles:", e);
        } finally {
            setPartnersLoading(false);
        }
    };
    
    fetchPartners();

  }, [chats, user, db]);


  if (isUserLoading || chatsLoading || partnersLoading) {
    return (
      <div className="flex justify-center items-center h-64"><Spinner /></div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <MessageSquare className="h-4 w-4" /><AlertTitle>Fout</AlertTitle><AlertDescription>Kon bestaande chats niet laden.</AlertDescription>
      </Alert>
    );
  }

  if (!chats || chats.length === 0) {
    return (
        <Alert>
            <MessageSquare className="h-4 w-4" /><AlertTitle>Geen Gesprekken</AlertTitle><AlertDescription>Je hebt nog geen gesprekken. Start een nieuw gesprek met je teamleden.</AlertDescription>
        </Alert>
    )
  }

  return (
    <div className="border rounded-lg max-h-[60vh] overflow-y-auto">
        {chats.map(chat => (
            <ExistingChatItem key={chat.id} chat={chat} partnersMap={partnersMap} />
        ))}
    </div>
  );
}
