
"use client";
import { useFirestore } from "@/firebase/client-provider";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import type { Alert as AlertData, WellnessScore } from "@/lib/types";

interface SaveWellnessScoreParams {
  db: ReturnType<typeof useFirestore>;
  userId: string;
  scores: Partial<WellnessScore>;
  summary: string;
}

export async function saveWellnessScores({
  db,
  userId,
  scores,
  summary,
}: SaveWellnessScoreParams) {
  if (!db || !userId) return;

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const wellnessRef = doc(db, "users", userId, "wellnessScores", today);

  // Filter out any key-value pairs where the value is null or undefined.
  // We keep empty strings for '...Reason' fields if the AI provides them.
  const cleanedScores = Object.entries(scores).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined) {
      (acc as any)[key] = value;
    }
    return acc;
  }, {} as Partial<WellnessScore>);


  const dataToSave: Partial<WellnessScore> & { updatedAt: any } = {
    ...cleanedScores,
    id: today,
    date: today,
    summary,
    updatedAt: serverTimestamp(),
  };

  try {
    // Using set with merge to create or update the document for the day
    await setDoc(wellnessRef, dataToSave, { merge: true });
  } catch (error) {
    const permissionError = new FirestorePermissionError({
      path: wellnessRef.path,
      operation: "write", // Covers both create and update
      requestResourceData: dataToSave,
    });
    errorEmitter.emit("permission-error", permissionError);
    // Re-throw to allow caller to handle UI state
    throw permissionError;
  }
}

interface SaveAlertParams {
  db: ReturnType<typeof useFirestore>;
  userId: string;
  alert: Omit<AlertData, 'id' | 'userId' | 'date' | 'status' | 'createdAt'>;
}

export async function saveAlert({ db, userId, alert }: SaveAlertParams) {
  if (!db || !userId) return;

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const alertCollectionRef = collection(db, "users", userId, "alerts");

  const dataToSave: Omit<AlertData, 'id'> = {
    ...alert,
    userId,
    date: today,
    status: "new",
    createdAt: serverTimestamp(),
  };
  
  const newAlertRef = doc(alertCollectionRef);

  try {
    await setDoc(newAlertRef, { ...dataToSave, id: newAlertRef.id });
  } catch (error) {
    const permissionError = new FirestorePermissionError({
      path: alertCollectionRef.path, // Use collection path for addDoc simulation
      operation: "create",
      requestResourceData: dataToSave,
    });
    errorEmitter.emit("permission-error", permissionError);
    throw permissionError;
  }
}
