
'use server';

import { getAdminDb } from '@/lib/server/admin-db-singleton';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserProfile, Conversation } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

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

  const db = getAdminDb();
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
    
    // Altijd de profielen ophalen om de meest recente data te garanderen.
    // Deze query vereist dat de security rules een 'list' op 'users' toestaan met een 'uid' in 'in' filter.
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
        name: groupName || undefined,
        participantProfiles, 
        lastMessage: isGroupChat ? `Groepschat "${groupName}" aangemaakt.` : "Gesprek is gestart.",
        lastMessageTimestamp: FieldValue.serverTimestamp(),
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
      
      // Update de hoofd-chat met de nieuwste profielinformatie.
      batch.set(chatRef, { participantProfiles }, { merge: true });

      for (const userId of existingChatData.participants) {
        const myChatRef = db.collection('users').doc(userId).collection('myChats').doc(chatId);
        // Gebruik `set` met `merge:true` om te creëren als het niet bestaat, of bij te werken als het wel bestaat.
        batch.set(myChatRef, { ...existingChatData, participantProfiles }, { merge: true });
      }
      
      await batch.commit();
      console.log(`[P2P Chat Action] Denormalization verified and profiles refreshed.`);
    }

    return { chatId, error: null };

  } catch (e: any) {
    console.error(`[P2P Chat Action] ERROR creating/getting chat for ${chatId}:`, e);

    if (e.code === 'permission-denied') {
        // Maak en propageer een contextuele fout
        const permissionError = new FirestorePermissionError({
            path: 'users',
            operation: 'list',
            requestResourceData: { where: `uid in [${participantIds.join(', ')}]` }
        });
        errorEmitter.emit('permission-error', permissionError);
        // Geef een generieke fout terug naar de client, de gedetailleerde fout is voor de ontwikkelaar.
        return { chatId: null, error: 'Permissiefout bij het ophalen van deelnemers.' };
    }

    const errorMessage = e instanceof Error ? e.message : "Onbekende serverfout";
    return { chatId: null, error: `Fout bij het starten van de chat: ${errorMessage}` };
  }
}

/**
 * Verstuurt een P2P-bericht. Deze actie is atomisch.
 * 1. Voegt het bericht toe aan de centrale `/p2p_chats/{chatId}/messages` collectie.
 * 2. Werkt `lastMessage` bij in het centrale `/p2p_chats/{chatId}` document.
 * 3. Werkt `lastMessage` bij in de gedenormaliseerde `/users/{userId}/myChats/{chatId}` documenten voor ALLE deelnemers.
 */
export async function sendP2PMessage(chatId: string, senderId: string, content: string) {
    if (!chatId || !senderId || !content) {
        throw new Error("Chat ID, sender ID, and content are required.");
    }
    const db = getAdminDb();
    const batch = db.batch();

    const messagesRef = db.collection('p2p_chats').doc(chatId).collection('messages');
    const newMessageRef = messagesRef.doc();
    batch.set(newMessageRef, {
        senderId,
        content,
        timestamp: FieldValue.serverTimestamp(),
    });

    const updateData = {
        lastMessage: content,
        lastMessageTimestamp: FieldValue.serverTimestamp(),
    };

    const chatRef = db.collection('p2p_chats').doc(chatId);
    batch.update(chatRef, updateData);

    const chatSnapshot = await chatRef.get();
    const participants = chatSnapshot.data()?.participants;

    if (participants && Array.isArray(participants)) {
        for (const userId of participants) {
            const myChatRef = db.collection('users').doc(userId).collection('myChats').doc(chatId);
            // Gebruik set met merge:true om te creëren als het niet bestaat, of bij te werken als het wel bestaat.
            batch.set(myChatRef, updateData, { merge: true });
        }
    }

    await batch.commit();
}
