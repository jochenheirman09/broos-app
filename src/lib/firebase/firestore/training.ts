"use client";

import { useFirestore } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";

interface AddPlayerTrainingParams {
  db: ReturnType<typeof useFirestore>;
  userId: string;
  date: Date;
  description: string;
}

export async function addPlayerTraining({
  db,
  userId,
  date,
  description,
}: AddPlayerTrainingParams) {
  if (!db || !userId) {
    throw new Error("Firestore instance and User ID are required.");
  }
  if (!date || !description) {
    throw new Error("Date and description are required.");
  }

  const trainingCollectionRef = collection(db, "users", userId, "trainings");
  const newTrainingRef = doc(trainingCollectionRef);
  
  const trainingData = {
    id: newTrainingRef.id,
    userId,
    date: date.toISOString().split("T")[0], // Store as YYYY-MM-DD
    description,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(newTrainingRef, trainingData)
  } catch (error) {
    console.error("Error adding player training:", error);
    const permissionError = new FirestorePermissionError({
      path: newTrainingRef.path,
      operation: "create",
      requestResourceData: trainingData,
    });
    errorEmitter.emit("permission-error", permissionError);
    throw permissionError;
  }
}
