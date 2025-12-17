
'use server';

import { getFirebaseAdmin } from '@/ai/genkit';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserProfile, Conversation, MyChat } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { sendNotification } from '@/ai/flows/notification-flow';

/**
 * Creates or retrieves a chat session and denormalizes its metadata.
 * This function now ensures that participant profiles are always included or updated.
 *
 * @param participantIds An array of all participating UIDs.
 * @param groupName The name for a group chat (null for 1-on-1).
 * @returns An object with the chatId or an error message.
 */
export async function createOrGetChat(
  participantIds: string[],
  groupName: string | null = null
): Promise<{ chatId: string | null; error: string | null }> {
  
  const uniqueParticipantIds = [...new Set(participantIds)];
  if (uniqueParticipantIds.length < 2) {
    return { chatId: null, error: "Er zijn minstens 2 unieke deelnemers nodig voor een chat." };
  }

  const isGroupChat = uniqueParticipantIds.length > 2;

  if (isGroupChat && !groupName) {
    return { chatId: null, error: "Een groepschat moet een naam hebben." };
  }

  const { adminDb: db } = await getFirebaseAdmin();
  let chatId: string;
  const p2pChatsRef = db.collection('p2p_chats');
  let chatRef;

  if (isGroupChat) {
    // For group chats, always create a new document to ensure uniqueness.
    chatRef = p2pChatsRef.doc();
    chatId = chatRef.id;
  } else {
    // For 1-on-1 chats, create a predictable ID based on sorted UIDs.
    chatId = uniqueParticipantIds.sort().join('_');
    chatRef = p2pChatsRef.doc(chatId);
  }
  
  try {
    const doc = await chatRef.get();
    
    // Fetch profiles for all participants to ensure data is up-to-date.
    const userDocs = await db.collection('users').where('uid', 'in', uniqueParticipantIds).get();
    const participantProfiles: { [key: string]: { name: string; photoURL?: string } } = {};
    
    userDocs.forEach(doc => {
        const user = doc.data() as UserProfile;
        if (user) {
            participantProfiles[doc.id] = {
                name: user.name || 'Onbekende Gebruiker',
                photoURL: user.photoURL || '',
            };
        }
    });

    const batch = db.batch();

    if (!doc.exists) {
      console.log(`[P2P Chat Action] Creating new chat: ${chatId}`);
      const chatData: Conversation = {
        id: chatId,
        participants: uniqueParticipantIds,
        isGroupChat,
        participantProfiles, 
        lastMessage: isGroupChat ? `Groepschat "${groupName}" aangemaakt.` : "Gesprek is gestart.",
        lastMessageTimestamp: FieldValue.serverTimestamp(),
        ...(isGroupChat && { name: groupName! })
      };
      
      batch.set(chatRef, chatData);
      
      uniqueParticipantIds.forEach(userId => {
        const myChatRef = db.collection('users').doc(userId).collection('myChats').doc(chatId);
        batch.set(myChatRef, chatData);
      });

    } else {
      console.log(`[P2P Chat Action] Chat already exists: ${chatId}. Verifying denormalization...`);
      const existingChatData = doc.data() as Conversation;
      const updatedChatData: MyChat = { ...existingChatData, participantProfiles, id: chatId };

      batch.set(chatRef, { participantProfiles }, { merge: true });

      for (const userId of existingChatData.participants) {
        const myChatRef = db.collection('users').doc(userId).collection('myChats').doc(chatId);
        batch.set(myChatRef, updatedChatData, { merge: true });
      }
    }

    await batch.commit();
    console.log(`[P2P Chat Action] Successfully created/updated and denormalized chat: ${chatId}`);

    return { chatId, error: null };

  } catch (e: any) {
    console.error(`[P2P Chat Action] ERROR creating/getting chat for ${participantIds.join(', ')}:`, e);
    return { chatId: null, error: `Fout bij het starten van de chat: ${e.message}` };
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
