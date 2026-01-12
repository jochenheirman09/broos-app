
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

function P2PChatLoader({ chatId }: { chatId: string }) {
  const { user, isUserLoading: userLoading } = useUser();
  const db = useFirestore();

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
      <div className="space-y-6">
        <Alert variant="destructive">
          <User className="h-4 w-4" /><AlertTitle>Fout</AlertTitle><AlertDescription>Kon de chatgegevens niet laden.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!chatData || !user || !chatData.participants.includes(user.uid)) {
       return (
            <div className="space-y-6">
                <Alert variant="destructive">
                <ShieldX className="h-4 w-4" /><AlertTitle>Geen Toegang</AlertTitle><AlertDescription>Je hebt geen toegang tot dit gesprek.</AlertDescription>
                </Alert>
            </div>
        );
  }
  
  return <P2PChatInterface chatId={chatId} chatData={chatData} />;
}


export default function P2PChatPage({ params }: { params: { chatId: string } }) {
  const { chatId } = params;
  
  return (
    <div className="flex flex-col flex-grow h-full">
        <P2PChatLoader chatId={chatId} />
    </div>
  );
}
