
"use client";

import { useFirestore } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { collection, doc, writeBatch, getDoc, query, where, getDocs, updateDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Function to generate a random 8-character alphanumeric code
const generateCode = (length = 8) => {
  const chars = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};


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

  const userRef = doc(db, "users", userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists() || userDoc.data().role !== 'responsible') {
    throw new Error("User is not a 'responsible' or does not exist.");
  }
  
  if (userDoc.data().clubId) {
    throw new Error("User already has a club.");
  }

  // This part is problematic with strict security rules, but we'll try it.
  // The alternative is a Cloud Function to check for uniqueness.
  const clubsRef = collection(db, "clubs");
  const q = query(clubsRef, where("name", "==", clubName));
  
  // The following query may fail if rules deny listing clubs.
  // We'll wrap it in a try-catch, but the primary error will be handled by the emitter.
  try {
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      throw new Error(`Een club met de naam "${clubName}" bestaat al. Vraag de clubbeheerder om je toegang te geven.`);
    }
  } catch (error) {
     const permissionError = new FirestorePermissionError({
        path: "clubs",
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
      // Re-throw to ensure the UI catches it
      throw new Error("Permission denied to check for existing clubs. Your security rules might be too strict to allow creating a club from the client-side.");
  }


  const batch = writeBatch(db);
  const clubRef = doc(collection(db, "clubs"));
  const clubData = {
    name: clubName,
    ownerId: userId,
    id: clubRef.id,
    invitationCode: generateCode(),
  };
  batch.set(clubRef, clubData);

  const userData = { clubId: clubRef.id };
  batch.update(userRef, userData);

  try {
    await batch.commit();
  } catch (error) {
    console.error("Batch commit failed in createClub:", error);

    const clubPermissionError = new FirestorePermissionError({
      path: clubRef.path,
      operation: "create",
      requestResourceData: clubData,
    });
    errorEmitter.emit("permission-error", clubPermissionError);

    // No need to emit for user update, as the batch fails atomically.
    throw error;
  }
}

export async function generateClubInvitationCode(
  db: ReturnType<typeof useFirestore>,
  clubId: string
) {
  if (!clubId) throw new Error("Club ID is required.");
  if (!db) throw new Error("Firestore is not available");

  const invitationCode = generateCode();
  const clubRef = doc(db, "clubs", clubId);
  const updateData = { invitationCode };

  try {
    await updateDoc(clubRef, updateData);
    return invitationCode;
  } catch (error) {
    console.error("Error generating club invitation code:", error);
    const permissionError = new FirestorePermissionError({
      path: clubRef.path,
      operation: "update",
      requestResourceData: updateData,
    });
    errorEmitter.emit("permission-error", permissionError);
    throw permissionError;
  }
}
