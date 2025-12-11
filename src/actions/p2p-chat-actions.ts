
'use server';

import { getAdminDb } from '@/lib/server/admin-db-singleton';
import { FieldValue } from 'firebase-admin/firestore';
import { useUser } from '@/context/user-context';

/**
 * Creates or retrieves a chat session, for both 1-on-1 and group chats.
 * @param participantIds An array of all participant UIDs.
 * @param groupName The name for the group chat (null for 1-on-1).
 * @returns An object with the chatId or an error message.
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
  let chatRef;

  if (isGroupChat) {
    // For a group chat, we always create a new document with a unique ID.
    chatRef = db.collection('p2p_chats').doc();
    chatId = chatRef.id;
    console.log(`[CHAT ACTION] Nieuwe groepschat aanmaken met ID: ${chatId}`);
  } else {
    // For a 1-on-1 chat, we generate a consistent ID to reuse existing chats.
    chatId = participantIds.sort().join('_');
    chatRef = db.collection('p2p_chats').doc(chatId);
    console.log(`[CHAT ACTION] 1-op-1 chat ID berekend: ${chatId}`);
  }
  
  try {
    const doc = await chatRef.get();

    if (!doc.exists) {
      console.log(`[CHAT ACTION] Chatdocument bestaat nog niet, wordt aangemaakt...`);
      
      // Get the name of the user creating the chat
      const creatorId = participantIds.find(id => id !== groupName); // Assuming creator is in the list
      let creatorName = 'Iemand';
      if (creatorId) {
        const creatorDoc = await db.collection('users').doc(creatorId).get();
        if (creatorDoc.exists) {
           creatorName = creatorDoc.data()?.name || 'Iemand';
        }
      }

      const initialMessage = isGroupChat
        ? `Groepschat "${groupName}" aangemaakt.`
        : "Gesprek is gestart.";

      await chatRef.set({
        participants: participantIds,
        isGroupChat,
        name: groupName,
        id: chatId, // Store the ID within the document
        lastMessage: initialMessage,
        lastMessageTimestamp: FieldValue.serverTimestamp(),
      });
      console.log(`[CHAT ACTION] Aanmaken gelukt: ${chatId}`);
    } else {
      console.log(`[CHAT ACTION] Document bestaat al: ${chatId}`);
    }

    return { chatId, error: null };

  } catch (e: any) {
    const errorMessage = e instanceof Error ? e.message : "Onbekende serverfout";
    console.error(`SERVER ACTION ERROR DETAILS (createOrGetChat voor ${chatId}):`, e);
    return { chatId: null, error: `Chatfout: ${errorMessage}` };
  }
}

