
'use server';

import { getFirebaseAdmin } from '@/ai/genkit';
import { FieldValue } from 'firebase-admin/firestore';
import type { UserProfile, Conversation, MyChat } from '@/lib/types';
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

      // Ensure participantProfiles are updated in the main chat document
      batch.set(chatRef, { participantProfiles }, { merge: true });

      // And also denormalize to each participant's `myChats` subcollection
      for (const userId of existingChatData.participants) {
        const myChatRef = db.collection('users').doc(userId).collection('myChats').doc(chatId);
        // Use set with merge to create/update the denormalized chat document
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
 * Sends a P2P message and triggers notifications to other participants.
 * Uses a Firestore transaction to ensure idempotency, preventing duplicate notifications
 * in a dual-server environment.
 */
export async function sendP2PMessage(chatId: string, senderId: string, content: string, messageId: string) {
    if (!chatId || !senderId || !content || !messageId) {
        throw new Error("Chat ID, sender ID, content, and a unique message ID are required.");
    }
    
    const { adminDb: db } = await getFirebaseAdmin();
    const chatRef = db.collection('p2p_chats').doc(chatId);
    // Use the client-provided unique ID for the new message document.
    const newMessageRef = chatRef.collection('messages').doc(messageId);

    try {
        await db.runTransaction(async (transaction) => {
            // 1. Idempotency Check: See if this message has already been processed.
            const doc = await transaction.get(newMessageRef);
            if (doc.exists) {
                console.log(`[P2P Chat Action] Transaction Aborted: Message ${messageId} already exists.`);
                return; // Abort transaction, we've done this already.
            }

            // 2. Get current chat data for consistency.
            const chatSnapshot = await transaction.get(chatRef);
            const chatData = chatSnapshot.data() as Conversation | undefined;
            if (!chatData) {
                throw new Error("Chat document not found inside transaction.");
            }

            // 3. Queue up all Firestore writes.
            const messageData = {
                id: messageId, // Store the ID within the document as well
                senderId,
                content,
                timestamp: FieldValue.serverTimestamp(),
                notificationStatus: 'sent' // Mark for notification, and as processed.
            };
            transaction.set(newMessageRef, messageData);

            const lastMessageUpdate = {
                lastMessage: content,
                lastMessageTimestamp: FieldValue.serverTimestamp(),
            };
            transaction.update(chatRef, lastMessageUpdate);

            // 4. Denormalize the last message update to each participant's `myChats` collection.
            chatData.participants.forEach(userId => {
                const myChatRef = db.collection('users').doc(userId).collection('myChats').doc(chatId);
                transaction.set(myChatRef, lastMessageUpdate, { merge: true });
            });
        });

        console.log(`[P2P Chat Action] Transaction for message ${messageId} committed successfully.`);

        // 5. Send notifications AFTER the transaction is successfully committed.
        const finalChatSnapshot = await chatRef.get();
        const finalChatData = finalChatSnapshot.data() as Conversation;

        if (finalChatData?.participants) {
            const senderProfile = finalChatData.participantProfiles?.[senderId];
            const senderName = senderProfile?.name || "Iemand";
            const title = finalChatData.isGroupChat ? `${senderName} in ${finalChatData.name}` : senderName;
            
            for (const userId of finalChatData.participants) {
                if (userId === senderId) continue;
                // Fire-and-forget notifications.
                sendNotification({
                    userId,
                    title,
                    body: content,
                    link: `/p2p-chat/${chatId}`
                }).catch(e => console.error(`Failed to send P2P notification to ${userId}:`, e));
            }
        }
    } catch (error) {
        console.error(`[P2P Chat Action] Transaction failed for chat ${chatId}:`, error);
        throw error;
    }
}
