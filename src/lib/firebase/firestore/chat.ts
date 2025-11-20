"use client";

import { useFirestore } from "@/firebase";
import {
  collection,
  writeBatch,
  getDocs,
  query,
  Firestore,
} from "firebase/firestore";

/**
 * Deletes all chat documents, their associated message subcollections, and all wellness scores for a specific user.
 * This function is intended for testing and development purposes for a full data reset.
 * @param db The Firestore instance.
 * @param userId The ID of the user whose chats should be deleted.
 */
export async function deleteAllUserChats(
  db: Firestore,
  userId: string
) {
  if (!db || !userId) {
    throw new Error("Firestore instance and User ID are required.");
  }

  const batch = writeBatch(db);

  // 1. Delete all chats and their messages
  const chatsRef = collection(db, "users", userId, "chats");
  const chatsSnapshot = await getDocs(chatsRef);

  for (const chatDoc of chatsSnapshot.docs) {
    // Delete subcollection of messages
    const messagesRef = collection(
      db,
      "users",
      userId,
      "chats",
      chatDoc.id,
      "messages"
    );
    const messagesSnapshot = await getDocs(query(messagesRef));
    messagesSnapshot.forEach((messageDoc) => {
      batch.delete(messageDoc.ref);
    });

    // Delete the parent chat document
    batch.delete(chatDoc.ref);
  }

  // 2. Delete all wellness scores
  const wellnessScoresRef = collection(db, "users", userId, "wellnessScores");
  const wellnessScoresSnapshot = await getDocs(wellnessScoresRef);
  wellnessScoresSnapshot.forEach((scoreDoc) => {
    batch.delete(scoreDoc.ref);
  });
  
  // Commit the batch operation
  await batch.commit();
}
