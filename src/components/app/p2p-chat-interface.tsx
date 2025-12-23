

"use client";

import { useMemo, useRef, useEffect } from 'react';
import { useUser } from '@/context/user-context';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollViewport } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SendHorizonal, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { P2PChatMessage, Conversation, WithId } from '@/lib/types';
import {
  collection,
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
import { sendP2PMessage } from '@/actions/p2p-chat-actions';
import { useForm } from "react-hook-form";

interface ChatInput {
    content: string;
}

function ChatMessage({ message, currentUserId, chatData }: { message: WithId<P2PChatMessage>, currentUserId: string, chatData: WithId<Conversation> }) {
  const isSender = message.senderId === currentUserId;
  const senderProfile = chatData.participantProfiles?.[message.senderId];
  const senderName = senderProfile?.name || 'Onbekend';
  const senderPhotoURL = senderProfile?.photoURL;
  const senderInitials = getInitials(senderName);

  return (
    <div
      className={cn(
        'flex items-end gap-2 my-2 group',
        isSender ? 'justify-end' : 'justify-start'
      )}
    >
      {!isSender && (
         <Avatar className="h-8 w-8">
            <AvatarImage src={senderPhotoURL} />
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
        {!isSender && <p className="text-xs font-bold mb-1 text-primary">{senderName}</p>}
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
}

export function P2PChatInterface({ chatId, chatData }: P2PChatInterfaceProps) {
  const { user, userProfile } = useUser();
  const db = useFirestore();
  const viewportRef = useRef<HTMLDivElement>(null);
  
  const form = useForm<ChatInput>({ defaultValues: { content: '' } });

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

  const handleSendMessage = async (data: ChatInput) => {
    if (!data.content.trim() || !user || !chatData) return;
    
    // Optimistically clear the input
    form.reset();

    // Fire-and-forget the server action. UI updates will come via the listener.
    sendP2PMessage(chatId, user.uid, data.content).catch(err => {
      console.error("Failed to send message:", err);
      // Optionally, revert the input field and show a toast
      form.setValue('content', data.content);
    });
  };

  const isGroupChat = chatData.isGroupChat;
  
  const otherParticipants = useMemo(() => {
    if (!chatData.participantProfiles || !user) return [];
    return Object.entries(chatData.participantProfiles)
      .filter(([uid]) => uid !== user.uid)
      .map(([, profile]) => profile.name);
  }, [chatData, user]);

  const otherUserId = useMemo(() => {
    if (isGroupChat || !user) return null;
    return chatData.participants.find(p => p !== user.uid);
  }, [chatData, user, isGroupChat]);

  const otherUserProfile = otherUserId ? chatData.participantProfiles?.[otherUserId] : null;

  const chatName = isGroupChat ? chatData.name : otherUserProfile?.name;
  const chatAvatarUrl = isGroupChat ? undefined : otherUserProfile?.photoURL;
  const chatAvatarFallback = isGroupChat ? <Users /> : getInitials(chatName);

  let subTitle;
    if (isGroupChat) {
        const MAX_NAMES_TO_SHOW = 2;
        if (otherParticipants.length > MAX_NAMES_TO_SHOW) {
            const shownNames = otherParticipants.slice(0, MAX_NAMES_TO_SHOW).join(', ');
            const remainingCount = otherParticipants.length - MAX_NAMES_TO_SHOW;
            subTitle = `${shownNames} en ${remainingCount} anderen`;
        } else {
            subTitle = otherParticipants.join(', ');
        }
    } else {
        subTitle = `${chatData.participants.length} deelnemers`;
    }

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
            <AvatarImage src={chatAvatarUrl} />
            <AvatarFallback className="bg-muted-foreground/20 font-bold">
              {chatAvatarFallback}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-xl">{chatName}</CardTitle>
            <p className="text-sm text-muted-foreground truncate max-w-xs">{subTitle}</p>
          </div>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col overflow-hidden p-0">
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-grow">
              <ScrollViewport ref={viewportRef} className="h-full">
                <div className="px-4">
                  {messages?.map((message) => (
                    <ChatMessage key={message.id} message={message} currentUserId={user!.uid} chatData={chatData} />
                  ))}
                </div>
              </ScrollViewport>
            </ScrollArea>
            <div className="p-4 border-t">
              <form onSubmit={form.handleSubmit(handleSendMessage)} className="flex gap-2">
                <Input
                  {...form.register('content')}
                  placeholder="Typ je bericht..."
                  autoComplete="off"
                />
                <Button type="submit" size="icon" disabled={!form.watch('content')?.trim()}>
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
