
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, type Analytics } from 'firebase/analytics';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getMessaging, type Messaging } from "firebase/messaging";


/**
 * Initializes a Firebase app instance, handling both client-side and server-side
 * environments, as well as automatic configuration from Firebase Hosting.
 *
 * @returns An object containing the initialized FirebaseApp, Auth, Firestore, and Analytics instances.
 */
export function initializeFirebase(): { firebaseApp: FirebaseApp; auth: Auth; firestore: Firestore, analytics: Analytics | null, messaging: Messaging | null } {
  // If no apps are initialized, create a new one.
  if (!getApps().length) {
    let firebaseApp: FirebaseApp;
    try {
      // In a Firebase App Hosting environment, `initializeApp()` without arguments
      // will automatically use the reserved environment variables.
      firebaseApp = initializeApp();
      console.info("Firebase initialized automatically via App Hosting.");
    } catch (e) {
      // If automatic initialization fails (e.g., local development),
      // fall back to the explicit config object.
      if (process.env.NODE_ENV === "production") {
        console.warn('Firebase automatic initialization failed. Falling back to firebaseConfig object. Error:', e);
      } else {
        console.info("Firebase initialized using local firebaseConfig object.");
      }
      firebaseApp = initializeApp(firebaseConfig);
    }
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
