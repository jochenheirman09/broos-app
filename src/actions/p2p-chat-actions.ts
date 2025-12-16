
'use server';

import { getFirebaseAdmin } from '@/ai/genkit';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserProfile, Conversation, MyChat } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { sendNotification } from '@/ai/flows/notification-flow';

/**
 * Creëert of haalt een chat-sessie op en denormaliseert de metadata.
 * Deze functie is nu robuuster en zorgt ervoor dat denormalisatie ook plaatsvindt
 * voor chats die al bestonden voordat de denormalisatiestrategie werd ingevoerd.
 *
 * @param participantIds Een array van alle deelnemende UID's.
 * @param groupName De naam voor een groepschat (null voor 1-op-1).
 * @returns Een object met de chatId of een foutmelding.
 */
export async function createOrGetChat(
  participantIds: string[],
  groupName: string | null = null
): Promise<{ chatId: string | null; error: string | null }> {
  
  if (!participantIds || participantIds.length < 2) {
    return { chatId: null, error: "Er zijn minstens 2 deelnemers nodig voor een chat." };
  }

  const isGroupChat = participantIds.length > 2;

  if (isGroupChat && !groupName) {
    return { chatId: null, error: "Een groepschat moet een naam hebben." };
  }

  const { adminDb: db } = await getFirebaseAdmin();
  let chatId: string;
  const p2pChatsRef = db.collection('p2p_chats');
  let chatRef;

  if (isGroupChat) {
    chatRef = p2pChatsRef.doc();
    chatId = chatRef.id;
  } else {
    chatId = participantIds.sort().join('_');
    chatRef = p2pChatsRef.doc(chatId);
  }
  
  try {
    const doc = await chatRef.get();
    
    const userDocs = await db.collection('users').where('uid', 'in', participantIds).get();
    const participantProfiles: { [key: string]: { name: string; photoURL?: string } } = {};
    
    userDocs.forEach(doc => {
        const user = doc.data() as UserProfile;
        participantProfiles[doc.id] = {
            name: user.name,
            photoURL: user.photoURL || '',
        };
    });

    if (!doc.exists) {
      console.log(`[P2P Chat Action] Creating new chat: ${chatId}`);
      const batch = db.batch();

      const chatData: Conversation = {
        id: chatId,
        participants: participantIds,
        isGroupChat,
        participantProfiles, 
        lastMessage: isGroupChat ? `Groepschat "${groupName}" aangemaakt.` : "Gesprek is gestart.",
        lastMessageTimestamp: FieldValue.serverTimestamp(),
        ...(isGroupChat && { name: groupName! })
      };
      
      batch.set(chatRef, chatData);
      
      participantIds.forEach(userId => {
        const myChatRef = db.collection('users').doc(userId).collection('myChats').doc(chatId);
        batch.set(myChatRef, chatData);
      });

      await batch.commit();
      console.log(`[P2P Chat Action] Successfully created and denormalized chat: ${chatId}`);

    } else {
      console.log(`[P2P Chat Action] Chat already exists: ${chatId}. Verifying denormalization...`);
      const existingChatData = doc.data() as Conversation;
      const batch = db.batch();
      
      const updatedChatData: MyChat = { ...existingChatData, participantProfiles, id: chatId };

      batch.set(chatRef, { participantProfiles }, { merge: true });

      for (const userId of existingChatData.participants) {
        const myChatRef = db.collection('users').doc(userId).collection('myChats').doc(chatId);
        batch.set(myChatRef, updatedChatData, { merge: true });
      }
      
      await batch.commit();
      console.log(`[P2P Chat Action] Denormalization verified and profiles refreshed.`);
    }

    return { chatId, error: null };

  } catch (e: any) {
    console.error(`[P2P Chat Action] ERROR creating/getting chat for ${chatId}:`, e);

    if (e.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
            path: 'users',
            operation: 'list',
            requestResourceData: { where: `uid in [${participantIds.join(', ')}]` }
        });
        errorEmitter.emit('permission-error', permissionError);
        return { chatId: null, error: 'Permissiefout bij het ophalen van deelnemers.' };
    }

    const errorMessage = e instanceof Error ? e.message : "Onbekende serverfout";
    return { chatId: null, error: `Fout bij het starten van de chat: ${errorMessage}` };
  }
}

/**
 * Verstuurt een P2P-bericht en triggert notificaties naar andere deelnemers.
 */
export async function sendP2PMessage(chatId: string, senderId: string, content: string) {
    if (!chatId || !senderId || !content) {
        throw new Error("Chat ID, sender ID, and content are required.");
    }
    const { adminDb: db } = await getFirebaseAdmin();
    const batch = db.batch();

    // 1. Save the new message
    const messagesRef = db.collection('p2p_chats').doc(chatId).collection('messages');
    const newMessageRef = messagesRef.doc();
    batch.set(newMessageRef, {
        senderId,
        content,
        timestamp: FieldValue.serverTimestamp(),
    });

    // 2. Update last message info on the root chat doc and all denormalized copies
    const updateData = {
        lastMessage: content,
        lastMessageTimestamp: FieldValue.serverTimestamp(),
    };
    const chatRef = db.collection('p2p_chats').doc(chatId);
    batch.update(chatRef, updateData);

    const chatSnapshot = await chatRef.get();
    const chatData = chatSnapshot.data() as Conversation | undefined;
    const participants = chatData?.participants;

    if (participants && Array.isArray(participants)) {
        for (const userId of participants) {
            const myChatRef = db.collection('users').doc(userId).collection('myChats').doc(chatId);
            batch.set(myChatRef, updateData, { merge: true });
        }
    }
    
    // Commit the message and all updates
    await batch.commit();

    // 3. Send notifications (after message is committed)
    if (participants && chatData) {
        const senderProfile = chatData.participantProfiles?.[senderId];
        const senderName = senderProfile?.name || "Iemand";
        const title = chatData.isGroupChat ? `${senderName} in ${chatData.name}` : senderName;
        
        for (const userId of participants) {
            // Don't send a notification to the sender
            if (userId === senderId) continue;

            sendNotification({
                userId: userId,
                title: title,
                body: content,
                link: `/p2p-chat/${chatId}`
            }).catch(e => console.error(`Failed to send P2P notification to ${userId}:`, e));
        }
    }
}
