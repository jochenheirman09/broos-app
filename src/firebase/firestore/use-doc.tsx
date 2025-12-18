
'use client';
    
import { useState, useEffect, useCallback } from 'react';
import {
  DocumentReference,
  onSnapshot,
  DocumentData,
  FirestoreError,
  DocumentSnapshot,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useDoc hook.
 * @template T Type of the document data.
 */
export interface UseDocResult<T> {
  data: WithId<T> | null;
  isLoading: boolean;
  error: FirestoreError | Error | null;
  forceRefetch: () => void;
}

/**
 * React hook to subscribe to a single Firestore document in real-time.
 * Handles nullable references.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedDocRef or BAD THINGS WILL HAPPEN.
 * Use useMemoFirebase to memoize it.
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {DocumentReference<DocumentData> | null | undefined} memoizedDocRef -
 * The Firestore DocumentReference. Waits if null/undefined.
 * @returns {UseDocResult<T>} Object with data, isLoading, error, and forceRefetch function.
 */
export function useDoc<T = any>(
  memoizedDocRef: (DocumentReference<DocumentData> & {__memo?: boolean}) | null | undefined,
): UseDocResult<T> {
  type StateDataType = WithId<T> | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  
  const forceRefetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const path = memoizedDocRef ? memoizedDocRef.path : 'unknown path';
    
    setIsLoading(true);
    setData(null);
    setError(null);
    
    if (!memoizedDocRef) {
      setIsLoading(false); 
      return;
    }
    
    const unsubscribe = onSnapshot(
      memoizedDocRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (!isMounted) return;
        if (snapshot.exists()) {
          setData({ ...(snapshot.data() as T), id: snapshot.id });
        } else {
          setData(null);
        }
        setError(null); 
        setIsLoading(false);
      },
      (error: FirestoreError) => {
        if (!isMounted) return;
        const contextualError = new FirestorePermissionError({
          operation: 'get',
          path: memoizedDocRef.path,
        })
        setError(contextualError)
        setData(null)
        setIsLoading(false)
        errorEmitter.emit('permission-error', contextualError);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    }
  }, [memoizedDocRef, refetchTrigger]);

  if (memoizedDocRef && !memoizedDocRef.__memo) {
    throw new Error('useDoc reference was not properly memoized using useMemoFirebase');
  }

  return { data, isLoading, error, forceRefetch };
}
