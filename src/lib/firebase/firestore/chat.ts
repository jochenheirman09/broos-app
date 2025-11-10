"use client";

import { useFirestore } from "@/firebase";
import {
  collection,
  writeBatch,
  getDocs,
  query,
} from "firebase/firestore";

/**
 * Deletes all chat documents and their associated message subcollections for a specific user.
 * This function is intended for testing and development purposes.
 * @param db The Firestore instance.
 * @param userId The ID of the user whose chats should be deleted.
 */
export async function deleteAllUserChats(
  db: ReturnType<typeof useFirestore>,
  userId: string
) {
  if (!db || !userId) {
    throw new Error("Firestore instance and User ID are required.");
  }

  const batch = writeBatch(db);
  const chatsRef = collection(db, "users", userId, "chats");
  const chatsSnapshot = await getDocs(chatsRef);

  // If there are no chats, there's nothing to do.
  if (chatsSnapshot.empty) {
    return;
  }

  // Iterate over each chat document to delete its messages subcollection
  for (const chatDoc of chatsSnapshot.docs) {
    const messagesRef = collection(
      db,
      "users",
      userId,
      "chats",
      chatDoc.id,
      "messages"
    );
    const messagesSnapshot = await getDocs(query(messagesRef));

    // Add all messages in the subcollection to the batch for deletion
    messagesSnapshot.forEach((messageDoc) => {
      batch.delete(messageDoc.ref);
    });

    // Add the parent chat document to the batch for deletion
    batch.delete(chatDoc.ref);
  }

  // Commit the batch operation
  await batch.commit();
}
