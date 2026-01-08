
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
  getDocs, // Import getDocs for one-time fetch
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
  forceRefetch: () => void; // Function to manually trigger a refetch.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries.
 * 
 * IMPORTANT! YOU MUST MEMOIZE the inputted memoizedTargetRefOrQuery or BAD THINGS WILL HAPPEN
 * use useMemo to memoize it per React guidence.  Also make sure that it's dependencies are stable
 * references
 *  
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or Query. Waits if null/undefined.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    memoizedTargetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const getPathFromQuery = (query: any): string => {
    if (!query) return 'unknown path';
    if (query.type === 'collection') {
      return (query as CollectionReference).path;
    }
    if (query._query?.path?.canonicalString) {
      return query._query.path.canonicalString();
    }
     if (query._query?.path?.toString) {
      return query._query.path.toString();
    }
    return 'path not parsable';
  }


  const forceRefetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const path = getPathFromQuery(memoizedTargetRefOrQuery);
    
    // Always start by resetting the state when the dependency changes.
    setIsLoading(true);
    setData(null);
    setError(null);
    
    if (!memoizedTargetRefOrQuery) {
      // If the query is null, we are done loading.
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const snapshot = await getDocs(memoizedTargetRefOrQuery);
        if (isMounted) {
          const results: ResultItemType[] = [];
          for (const doc of snapshot.docs) {
            results.push({ ...(doc.data() as T), id: doc.id });
          }
          setData(results);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error(`[useCollection] PERMISSION ERROR on: ${path}`, err);
          const contextualError = new FirestorePermissionError({
            operation: 'list',
            path,
          })
          setError(contextualError);
          setData(null);
          errorEmitter.emit('permission-error', contextualError);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchData();

    return () => {
      isMounted = false;
    }
  }, [memoizedTargetRefOrQuery, refetchTrigger]); // Re-run if the target query/reference or trigger changes.

  if(memoizedTargetRefOrQuery && !memoizedTargetRefOrQuery.__memo) {
    throw new Error('useCollection query was not properly memoized using useMemoFirebase');
  }
  return { data, isLoading, error, forceRefetch };
}
