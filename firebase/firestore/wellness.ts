
"use client";

import { useFirestore } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { Alert as AlertData, WellnessScore } from "@/lib/types";

// This file remains for potential client-side use in the future,
// but the core logic for saving scores and alerts has been moved to the
// `chatWithBuddy` server action (`src/actions/chat-actions.ts`) for
// better security, atomicity, and centralization.

// The functions are kept here but are no longer called from the chat interface.

interface SaveWellnessScoresParams {
  db: ReturnType<typeof useFirestore>;
  userId: string;
  scores: Omit<WellnessScore, "id" | "date" | "updatedAt">;
}

/**
 * @deprecated This function is no longer used by the chat interface.
 * Logic has been moved to the `chatWithBuddy` server action.
 */
export async function saveWellnessScores({
  db,
  userId,
  scores,
}: SaveWellnessScoresParams) {
  if (!db || !userId) return;

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const scoreRef = doc(db, "users", userId, "wellnessScores", today);
  
  const dataToSave = {
    ...scores,
    id: today,
    date: today,
    updatedAt: serverTimestamp(),
  };

  try {
    // Use set with merge to create or update the document for the day.
    await setDoc(scoreRef, dataToSave, { merge: true });
    console.log(`[Firestore] Wellness scores for ${today} saved for user ${userId}.`);
  } catch (error) {
    console.error("Error saving wellness scores:", error);
    const permissionError = new FirestorePermissionError({
      path: scoreRef.path,
      operation: "write", // Covers both create and update
      requestResourceData: dataToSave,
    });
    errorEmitter.emit("permission-error", permissionError);
    throw permissionError;
  }
}


interface SaveAlertParams {
  db: ReturnType<typeof useFirestore>;
  userId: string;
  alert: Omit<AlertData, 'id' | 'userId' | 'date' | 'status' | 'createdAt'>;
}

/**
 * @deprecated This function is no longer used by the chat interface.
 * Logic has been moved to the `chatWithBuddy` server action.
 */
export async function saveAlert({ db, userId, alert }: SaveAlertParams) {
  if (!db || !userId) return;

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const alertCollectionRef = collection(db, "users", userId, "alerts");
  const newAlertRef = doc(alertCollectionRef);

  const dataToSave: Omit<AlertData, 'id'> = {
    ...alert,
    userId,
    date: today,
    status: "new",
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(newAlertRef, { ...dataToSave, id: newAlertRef.id });
  } catch (error) {
    console.error("Error saving alert:", error);
    const permissionError = new FirestorePermissionError({
      path: newAlertRef.path,
      operation: "create",
      requestResourceData: dataToSave,
    });
    errorEmitter.emit("permission-error", permissionError);
    throw permissionError;
  }
}
