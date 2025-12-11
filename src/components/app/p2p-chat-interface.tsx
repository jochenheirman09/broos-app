
'use client';

import { useState, useRef, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollViewport } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SendHorizonal, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { P2PChatMessage, UserProfile, Conversation, WithId } from '@/lib/types';
import {
  collection,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function ChatMessage({ message, currentUserId, allPartners }: { message: WithId<P2PChatMessage>, currentUserId: string, allPartners: Map<string, WithId<UserProfile>> | null }) {
  const isSender = message.senderId === currentUserId;
  const senderProfile = isSender ? null : allPartners?.get(message.senderId);
  const senderInitials = getInitials(senderProfile?.name);

  return (
    <div
      className={cn(
        'flex items-end gap-2 my-2 group',
        isSender ? 'justify-end' : 'justify-start'
      )}
    >
      {!isSender && (
         <Avatar className="h-8 w-8">
            <AvatarImage src={senderProfile?.photoURL} />
            <AvatarFallback className="text-xs bg-muted-foreground/20 font-bold">
              {senderInitials}
            </AvatarFallback>
          </Avatar>
      )}
      <div
        className={cn(
          'max-w-md rounded-2xl px-4 py-2 shadow-clay-card',
          isSender
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-muted rounded-bl-none'
        )}
      >
        {!isSender && senderProfile && <p className="text-xs font-bold mb-1 text-primary">{senderProfile.name}</p>}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

const getInitials = (name: string = '') => {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase();
};

interface P2PChatInterfaceProps {
    chatId: string;
    chatData: WithId<Conversation>;
    otherUser?: WithId<UserProfile>; // For 1-on-1
    allPartners: Map<string, WithId<UserProfile>> | null; // For group chats
}

export function P2PChatInterface({ chatId, otherUser, chatData, allPartners }: P2PChatInterfaceProps) {
  const { user } = useUser();
  const db = useFirestore();
  const [input, setInput] = useState('');
  const viewportRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useMemoFirebase(() => {
    if (!chatId) return null;
    return query(
      collection(db, 'p2p_chats', chatId, 'messages'),
      orderBy('timestamp', 'asc'),
      limit(100)
    );
  }, [chatId, db]);
  const { data: messages } = useCollection<P2PChatMessage>(messagesQuery);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user || !chatData) return;

    const chatRef = doc(db, 'p2p_chats', chatId);
    const messagesRef = collection(chatRef, 'messages');

    await addDoc(messagesRef, {
      content: input,
      senderId: user.uid,
      timestamp: serverTimestamp(),
    });
    
    await setDoc(chatRef, {
      lastMessage: input,
      lastMessageTimestamp: serverTimestamp(),
    }, { merge: true });

    setInput('');
  };

  const isGroupChat = chatData?.isGroupChat;
  const chatName = isGroupChat ? chatData?.name : otherUser?.name;

  return (
    <div className="container mx-auto py-8">
      <Card className="h-[calc(100vh-10rem)] flex flex-col">
        <CardHeader className="flex-row items-center gap-4">
          <Link href="/p2p-chat" passHref>
             <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft />
             </Button>
          </Link>
          <Avatar className="h-12 w-12">
            {!isGroupChat && <AvatarImage src={otherUser?.photoURL} />}
            <AvatarFallback className="bg-muted-foreground/20 font-bold">
              {isGroupChat ? <Users /> : getInitials(chatName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-xl">{chatName}</CardTitle>
            {isGroupChat && <p className="text-sm text-muted-foreground">{chatData.participants.length} deelnemers</p>}
          </div>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col overflow-hidden p-0">
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-grow">
              <ScrollViewport ref={viewportRef} className="h-full">
                <div className="px-4">
                  {messages?.map((message) => (
                    <ChatMessage key={message.id} message={message} currentUserId={user!.uid} allPartners={allPartners} />
                  ))}
                </div>
              </ScrollViewport>
            </ScrollArea>
            <div className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Typ je bericht..."
                  autoComplete="off"
                />
                <Button type="submit" size="icon" disabled={!input.trim()}>
                  <SendHorizonal className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
