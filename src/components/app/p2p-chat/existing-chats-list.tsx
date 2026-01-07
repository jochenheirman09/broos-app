

"use client";

import { useUser } from "@/context/user-context";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import type { MyChat, WithId } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";

function ExistingChatItem({ chat }: { chat: WithId<MyChat> }) {
  const { user } = useUser();
  const unreadCount = (user && chat.unreadCounts?.[user.uid]) || 0;

  const getInitials = (name: string = '') => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  const otherParticipants = chat.participantProfiles
    ? Object.entries(chat.participantProfiles).filter(([uid]) => uid !== user?.uid)
    : [];

  let title = chat.name || "Groepschat";
  let avatarUrl: string | undefined = undefined;
  let fallback: React.ReactNode = <Users className="h-6 w-6" />;
  
  if (!chat.isGroupChat && otherParticipants.length === 1) {
    const [, otherProfile] = otherParticipants[0];
    title = otherProfile.name;
    avatarUrl = otherProfile.photoURL;
    fallback = <>{getInitials(otherProfile.name)}</>;
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
          <div className="flex justify-between items-center mt-1">
            <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
            {unreadCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}


export function ExistingChatsList() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  
  // AANGEPAST: De query leest nu de veilige, gedenormaliseerde subcollectie.
  const myChatsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, "users", user.uid, "myChats"),
      orderBy("lastMessageTimestamp", "desc")
    );
  }, [user, db]);

  // We gebruiken MyChat, wat een kopie is van Conversation
  const { data: chats, isLoading, error } = useCollection<MyChat>(myChatsQuery);
  
  if (isUserLoading || isLoading) {
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
            <ExistingChatItem key={chat.id} chat={chat} />
        ))}
    </div>
  );
}

    
