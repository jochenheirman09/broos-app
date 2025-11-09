"use client";

import { useFirestore } from "@/firebase";
import { collection, doc, writeBatch } from "firebase/firestore";

export async function createClub(
  db: ReturnType<typeof useFirestore>,
  userId: string,
  clubName: string
) {
  if (!userId) {
    throw new Error("User ID is required to create a club.");
  }
  if (!db) {
    throw new Error("Firestore is not available.");
  }

  const batch = writeBatch(db);

  // 1. Create the new club document
  const clubRef = doc(collection(db, "clubs")); // Create a ref with a new ID
  batch.set(clubRef, {
    name: clubName,
    ownerId: userId,
    id: clubRef.id,
  });

  // 2. Update the user's document with the new club ID
  const userRef = doc(db, "users", userId);
  batch.update(userRef, { clubId: clubRef.id });

  // 3. Commit the batch
  await batch.commit();

  return clubRef.id;
}
