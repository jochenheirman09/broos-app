"use client";

import { useFirestore } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
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
  const clubRef = doc(collection(db, "clubs"));
  const clubData = {
    name: clubName,
    ownerId: userId,
    id: clubRef.id,
  };
  batch.set(clubRef, clubData);

  const userRef = doc(db, "users", userId);
  const userData = { clubId: clubRef.id };
  batch.update(userRef, userData);

  return batch.commit().catch(() => {
    // Attempt to determine which operation failed, though batch errors are not specific.
    // We can emit a generic write error for the club path.
    const permissionError = new FirestorePermissionError({
      path: clubRef.path,
      operation: "create",
      requestResourceData: clubData,
    });
    errorEmitter.emit("permission-error", permissionError);

    // Also consider the user update might have failed.
    const userPermissionError = new FirestorePermissionError({
      path: userRef.path,
      operation: "update",
      requestResourceData: userData,
    });
    errorEmitter.emit("permission-error", userPermissionError);

    // Re-throw the original error to allow the caller to handle the promise rejection.
    throw permissionError;
  });
}
