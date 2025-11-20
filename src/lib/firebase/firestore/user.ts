
'use client';

import { useFirestore } from '@/firebase/client-provider';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { doc, updateDoc } from 'firebase/firestore';

interface UpdateUserProfileParams {
  db: ReturnType<typeof useFirestore>;
  userId: string;
  data: { [key: string]: any };
}

/**
 * Updates a user's profile document in Firestore.
 * This is now a blocking async function that returns a promise.
 * @param {UpdateUserProfileParams} params - The parameters for the update.
 * @returns A promise that resolves when the update is complete.
 */
export async function updateUserProfile({ db, userId, data }: UpdateUserProfileParams): Promise<void> {
  if (!db || !userId) {
    throw new Error('Firestore instance and User ID are required for update.');
  }

  const userRef = doc(db, 'users', userId);

  try {
    // This is now an awaited operation.
    await updateDoc(userRef, data);
  } catch (error) {
    const permissionError = new FirestorePermissionError({
      path: userRef.path,
      operation: 'update',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
    // Re-throw the error so the caller can handle it (e.g., in a try-catch block).
    throw error;
  }
}
