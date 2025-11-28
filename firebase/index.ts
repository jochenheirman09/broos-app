
'use client';

import { initializeApp, getApps, getApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { getAnalytics, type Analytics } from 'firebase/analytics';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getMessaging, type Messaging } from "firebase/messaging";


// This config is public and safe to commit. It is used to identify your Firebase project on the client-side.
export const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyBVOId-CRlTD6oKqvZ0CxKSFxObOoHEHd8",
  authDomain: "studio-5690519872-e0869.firebaseapp.com",
  projectId: "studio-5690519872-e0869",
  storageBucket: "studio-5690519872-e0869.appspot.com",
  messagingSenderId: "796529432751",
  appId: "1:796529432751:web:da147b13f407d67aaf9c5a",
  measurementId: "G-14976CYFEK"
};


/**
 * Initializes a Firebase app instance, handling both client-side and server-side
 * environments, as well as automatic configuration from Firebase Hosting.
 *
 * @returns An object containing the initialized FirebaseApp, Auth, Firestore, and Analytics instances.
 */
export function initializeFirebase(): { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore, analytics: Analytics | null, messaging: Messaging | null } {
  // If no apps are initialized, create a new one.
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    console.info("Firebase initialized using hardcoded firebaseConfig object.");
    return getSdks(firebaseApp);
  }

  // If an app is already initialized, get the existing instance.
  return getSdks(getApp());
}

/**
 * A helper function to get the SDK instances from a FirebaseApp.
 *
 * @param firebaseApp The FirebaseApp instance.
 * @returns An object containing the Auth and Firestore SDKs.
 */
function getSdks(firebaseApp: FirebaseApp) {
  let analytics: Analytics | null = null;
  let messaging: Messaging | null = null;
  if (typeof window !== 'undefined') {
    // Analytics is only available in the browser
    analytics = getAnalytics(firebaseApp);
    messaging = getMessaging(firebaseApp);
  }
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    analytics,
    messaging,
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './errors';
export * from './error-emitter';
export * from './FirebaseErrorListener';
