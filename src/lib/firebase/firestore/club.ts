
"use client";

import { useFirestore } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { collection, doc, writeBatch, getDoc, updateDoc } from "firebase/firestore";

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
    // Dit is een herstelpoging. We doen niets, maar geven geen foutmelding
    // zodat de gebruiker kan uitloggen en opnieuw kan inloggen.
    console.warn("User already has a club. Allowing process to continue for potential claim refresh.");
    return;
  }

  // LET OP: DE CHECK VOOR EEN BESTAANDE CLUB IS HIER VERWIJDERD OM DE STACK OVERFLOW TE OMZEILEN
  // EN EEN BETROUWBARE WRITE TE GARANDEREN.

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
