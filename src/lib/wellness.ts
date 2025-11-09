"use client";
import { useFirestore } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { collection, doc, setDoc, serverTimestamp, addDoc } from "firebase/firestore";
import type { WellnessScore } from "./types";
import type { Alert as AlertType } from "@/ai/types";


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

  const dataToSave: Partial<WellnessScore> & { updatedAt: any } = {
    ...scores,
    id: today,
    date: today,
    summary,
    updatedAt: serverTimestamp(),
  };

  // Using set with merge to create or update the document for the day
  return setDoc(wellnessRef, dataToSave, { merge: true }).catch((error) => {
    const permissionError = new FirestorePermissionError({
      path: wellnessRef.path,
      operation: "write", // Covers both create and update
      requestResourceData: dataToSave,
    });
    errorEmitter.emit("permission-error", permissionError);
    // Re-throw to allow caller to handle UI state
    throw permissionError;
  });
}

interface SaveAlertParams {
    db: ReturnType<typeof useFirestore>;
    userId: string;
    alert: AlertType;
}

export async function saveAlert({ db, userId, alert }: SaveAlertParams) {
    if (!db || !userId) return;

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const alertRef = collection(db, "users", userId, "alerts");

    const dataToSave = {
        ...alert,
        userId,
        date: today,
        status: 'new',
        createdAt: serverTimestamp(),
    };

    return addDoc(alertRef, dataToSave).catch((error) => {
        const permissionError = new FirestorePermissionError({
            path: alertRef.path,
            operation: 'create',
            requestResourceData: dataToSave,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw permissionError;
    });
}
