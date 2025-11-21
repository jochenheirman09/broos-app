
"use client";

import React, { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { onAuthStateChanged, type Auth, type User, getAuth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { useDoc, type UseDocResult } from './firestore/use-doc';
import { useCollection, type UseCollectionResult } from './firestore/use-collection';
import { FirebaseProvider, useMemoFirebase } from './provider';


interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

interface FirebaseContextValue extends FirebaseServices {
  user: User | null;
  isUserLoading: boolean;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

// IMPORTANT: Replace these placeholder values with your actual Firebase config values.
// You can find them in your Firebase project settings.
const firebaseConfig = {
  apiKey: "AIzaSyBVOId-CRlTD6oKqvZ0CxKSFxObOoHEHd8",
  authDomain: "studio-5690519872-e0869.firebaseapp.com",
  projectId: "studio-5690519872-e0869",
  storageBucket: "studio-5690519872-e0869.firebasestorage.app",
  messagingSenderId: "796529432751",
  appId: "1:796529432751:web:da147b13f407d67aaf9c5a",
  measurementId: "G-14976CYFEK",
};


export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const firebaseServices = useMemo(() => {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.error("Firebase config values are placeholders. Please replace them in src/firebase/client-provider.tsx.");
      // Initialize with dummy values to prevent crashes, but functionality will be broken.
      const app = getApps().length > 0 ? getApp() : initializeApp({apiKey: "dummy-key", projectId: "dummy-project"});
      return { firebaseApp: app, auth: getAuth(app), firestore: getFirestore(app) };
    }
    const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    return {
      firebaseApp: app,
      auth: getAuth(app),
      firestore: getFirestore(app),
    };
  }, []);

  const [user, setUser] = useState<User | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseServices.auth, (user) => {
      setUser(user);
      setIsUserLoading(false);
    });
    return () => unsubscribe();
  }, [firebaseServices.auth]);

  const contextValue = useMemo(() => ({
    ...firebaseServices,
    user,
    isUserLoading,
  }), [firebaseServices, user, isUserLoading]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseProvider {...firebaseServices}>
        {children}
      </FirebaseProvider>
    </FirebaseContext.Provider>
  );
}

export const useFirebase = (): FirebaseContextValue => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseClientProvider.');
  }
  return context;
};

export const useAuth = (): Auth => useFirebase().auth;
export const useFirestore = (): Firestore => useFirebase().firestore;
export const useFirebaseApp = (): FirebaseApp => useFirebase().firebaseApp;
export const useUser = () => useFirebase();

// Re-exporting these hooks from here to maintain a single entry point
export { useDoc, useCollection, useMemoFirebase };
export type { UseDocResult, UseCollectionResult };
