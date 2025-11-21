
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

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const firebaseServices = useMemo(() => {
    
    // Construct the config object directly here.
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    };
    
    // --- Extensive Debug Logging ---
    console.log("--- Firebase Config In-Component Debug ---");
    console.log("process.env.NEXT_PUBLIC_FIREBASE_API_KEY:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY);
    console.log("process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
    console.log("process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
    console.log("process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    console.log("process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID);
    console.log("process.env.NEXT_PUBLIC_FIREBASE_APP_ID:", process.env.NEXT_PUBLIC_FIREBASE_APP_ID);
    console.log("process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:", process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID);
    console.log("Constructed firebaseConfig object:", firebaseConfig);
    console.log("--- End Debug ---");


    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.error("Firebase API Key or Project ID is missing. Firebase cannot be initialized properly.");
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
