'use client';

import { useFirestore } from '@/firebase';
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
 * Implements non-blocking write with centralized error handling.
 * @param {UpdateUserProfileParams} params - The parameters for the update.
 */
export function updateUserProfile({ db, userId, data }: UpdateUserProfileParams) {
  if (!db || !userId) {
    console.error('Firestore instance and User ID are required for update.');
    return;
  }

  const userRef = doc(db, 'users', userId);

  updateDoc(userRef, data).catch((error) => {
    console.error('Error updating user profile:', error);
    const permissionError = new FirestorePermissionError({
      path: userRef.path,
      operation: 'update',
      requestResourceData: data,
    });
    errorEmitter.emit('permission-error', permissionError);
    // The promise is intentionally not returned to the UI,
    // as errors are handled globally. The UI can proceed with optimistic updates.
  });
}
