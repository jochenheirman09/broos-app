
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
      
      const unreadCounts = Object.fromEntries(uniqueParticipantIds.map(id => [id, 0]));

      const chatData: Conversation = {
        id: chatId,
        participants: uniqueParticipantIds,
        isGroupChat,
        participantProfiles, 
        lastMessage: isGroupChat ? `Groepschat "${groupName}" aangemaakt.` : "Gesprek is gestart.",
        lastMessageTimestamp: FieldValue.serverTimestamp(),
        unreadCounts,
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
        // Use set with merge to create/update the denormalized user document
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
 * Sends a P2P message using a transaction to ensure idempotency, preventing duplicate notifications.
 * This version uses a `notificationSent` flag on the message document itself.
 */
export async function sendP2PMessage(chatId: string, senderId: string, content: string, messageId: string) {
    if (!chatId || !senderId || !content || !messageId) {
        throw new Error("Chat ID, sender ID, content, and a unique message ID are required.");
    }
    
    const { adminDb: db } = await getFirebaseAdmin();
    const chatRef = db.collection('p2p_chats').doc(chatId);
    const newMessageRef = chatRef.collection('messages').doc(messageId);

    try {
        // First, create the message and update chat metadata in one transaction.
        await db.runTransaction(async (transaction) => {
            const chatSnapshot = await transaction.get(chatRef);
            const chatData = chatSnapshot.data() as Conversation | undefined;
            if (!chatData) {
                throw new Error("Chat document not found inside transaction.");
            }

            const messageData = {
                id: messageId,
                senderId,
                content,
                timestamp: FieldValue.serverTimestamp(),
                notificationSent: false, // Start with false
            };
            transaction.set(newMessageRef, messageData);

            const lastMessageUpdate: { [key: string]: any } = {
                lastMessage: content,
                lastMessageTimestamp: FieldValue.serverTimestamp(),
            };
            
            chatData.participants.forEach(userId => {
                if (userId !== senderId) {
                    lastMessageUpdate[`unreadCounts.${userId}`] = FieldValue.increment(1);
                }
            });
            
            transaction.update(chatRef, lastMessageUpdate);

            chatData.participants.forEach(userId => {
                const myChatRef = db.collection('users').doc(userId).collection('myChats').doc(chatId);
                transaction.set(myChatRef, lastMessageUpdate, { merge: true });
            });
        });
        console.log(`[P2P Chat Action] Message ${messageId} saved successfully.`);

        // Second, perform the idempotent notification check and send.
        const shouldSend = await db.runTransaction(async (transaction) => {
            const messageDoc = await transaction.get(newMessageRef);
            if (!messageDoc.exists || messageDoc.data()?.notificationSent === true) {
                return false;
            }
            transaction.update(newMessageRef, { notificationSent: true });
            return true;
        });

        if (shouldSend) {
            console.log(`[P2P Chat Action] ✅ WINNER for message ${messageId}, sending notification...`);
            const finalChatSnapshot = await chatRef.get();
            const finalChatData = finalChatSnapshot.data() as Conversation;

            if (finalChatData?.participants) {
                const senderProfile = finalChatData.participantProfiles?.[senderId];
                const senderName = senderProfile?.name || "Iemand";
                const title = finalChatData.isGroupChat ? `${senderName} in ${finalChatData.name}` : senderName;
                
                for (const userId of finalChatData.participants) {
                    if (userId === senderId) continue;
                    sendNotification({
                        userId,
                        title,
                        body: content,
                        link: `/p2p-chat/${chatId}`,
                        id: messageId, // Pass messageId for tagging
                    }).catch(e => console.error(`[P2P Chat Action] Failed to send notification to ${userId}:`, e));
                }
            }
        } else {
             console.log(`[P2P Chat Action] ❌ Notification already handled for message ${messageId}. Skipping.`);
        }

    } catch (error) {
        console.error(`[P2P Chat Action] ❌ Transaction or send failed for chat ${chatId}:`, error);
        throw error;
    }
}


/**
 * Resets the unread count for a specific user in a specific chat.
 */
export async function markChatAsRead(userId: string, chatId: string): Promise<void> {
    if (!userId || !chatId) {
        console.error("[markChatAsRead] User ID and Chat ID are required.");
        return;
    }
    
    console.log(`[P2P Chat Action] Marking chat ${chatId} as read for user ${userId}`);
    const { adminDb: db } = await getFirebaseAdmin();
    const batch = db.batch();

    const mainChatRef = db.collection('p2p_chats').doc(chatId);
    const userChatRef = db.collection('users').doc(userId).collection('myChats').doc(chatId);
    
    const updateData = {
        [`unreadCounts.${userId}`]: 0
    };

    // Update both the main document and the denormalized user document
    batch.set(mainChatRef, updateData, { merge: true });
    batch.set(userChatRef, updateData, { merge: true });
    
    try {
        await batch.commit();
        console.log(`[P2P Chat Action] Successfully reset unread count for user ${userId} in chat ${chatId}.`);
    } catch (error) {
        console.error(`[P2P Chat Action] Failed to mark chat as read:`, error);
    }
}

    

    
