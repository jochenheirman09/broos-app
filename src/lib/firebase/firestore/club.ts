
"use client";

import { useFirestore } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { collection, doc, writeBatch, getDoc, query, where, getDocs } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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

  // --- NIEUWE VALIDATIE ---
  // Controleer of er al een club met deze naam bestaat.
  // We gebruiken een query om dit te controleren.
  const clubsRef = collection(db, "clubs");
  const q = query(clubsRef, where("name", "==", clubName));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    // Als de query resultaten oplevert, bestaat de clubnaam al.
    throw new Error(`Een club met de naam "${clubName}" bestaat al.`);
  }
  // --- EINDE NIEUWE VALIDATIE ---


  const batch = writeBatch(db);
  const clubRef = doc(collection(db, "clubs"));
  const clubData = {
    name: clubName,
    ownerId: userId,
    id: clubRef.id,
  };
  batch.set(clubRef, clubData);

  const userData = { clubId: clubRef.id };
  batch.update(userRef, userData);

  try {
    await batch.commit();
    // After successful commit, force a refresh of the user's ID token.
    // This isn't strictly necessary for Firestore data changes, but good practice
    // if custom claims were involved. More importantly, we can trigger a state update.
    const auth = getAuth();
    if (auth.currentUser) {
        // This is a bit of a hack. The user context listens to onAuthStateChanged and onSnapshot.
        // The onSnapshot should pick up the user document change, but sometimes it can be slow.
        // A full user reload can sometimes help trigger listeners faster.
        await auth.currentUser.reload();
    }
  } catch (error) {
    console.error("Batch commit failed in createClub:", error);

    const clubPermissionError = new FirestorePermissionError({
      path: clubRef.path,
      operation: "create",
      requestResourceData: clubData,
    });
    errorEmitter.emit("permission-error", clubPermissionError);

    const userPermissionError = new FirestorePermissionError({
      path: userRef.path,
      operation: "update",
      requestResourceData: userData,
    });
    errorEmitter.emit("permission-error", userPermissionError);

    throw error;
  }
}
