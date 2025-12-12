
'use client';

import { use } from 'react';
import { useUser } from '@/context/user-context';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { Conversation, WithId } from '@/lib/types';
import { P2PChatInterface } from '@/components/app/p2p-chat-interface';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User, ShieldX } from 'lucide-react';
import React from 'react';

// De complexe `usePartnerProfiles` hook is niet langer nodig omdat
// de profielinformatie nu direct beschikbaar is in het `chatData` object.

function P2PChatLoader({ chatId }: { chatId: string }) {
  const { user, isUserLoading: userLoading } = useUser();
  const db = useFirestore();

  // We halen nog steeds het centrale chat-document op, want daar staan de berichten.
  const chatDocRef = useMemoFirebase(() => {
      if (!chatId) return null;
      return doc(db, 'p2p_chats', chatId);
  }, [chatId, db]);
  
  const { data: chatData, isLoading: chatLoading, error: chatError } = useDoc<Conversation>(chatDocRef);

  const isLoading = userLoading || chatLoading;

  if (isLoading) {
    return <div className="flex h-full w-full items-center justify-center"><Spinner /></div>;
  }
  
  if (chatError) {
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
  
  // De `P2PChatInterface` component krijgt nu het volledige `chatData`-object,
  // inclusief de gedenormaliseerde `participantProfiles`.
  return <P2PChatInterface chatId={chatId} chatData={chatData} />;
}


export default function P2PChatPage({ params }: { params: Promise<{ chatId: string }> }) {
  const { chatId } = use(params);
  
  return <P2PChatLoader chatId={chatId} />;
}
