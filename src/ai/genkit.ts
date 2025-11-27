
'use server';

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

// --- Firebase Admin SDK ---
let _firebaseAdminApp: App | null = null;
let _adminDb: Firestore | null = null;
let _adminAuth: Auth | null = null;
let _adminMessaging: Messaging | null = null;

/**
 * Initializes and returns the Firebase Admin SDK instances.
 * It uses a singleton pattern to ensure it's only initialized once.
 *
 * @returns An object containing the admin app, db, and auth instances.
 */
export async function getFirebaseAdmin() {
  if (_firebaseAdminApp) {
    return {
      adminApp: _firebaseAdminApp,
      adminDb: _adminDb!,
      adminAuth: _adminAuth!,
      adminMessaging: _adminMessaging!,
    };
  }

  // This change forces a new build to load secrets.
  const serviceAccountKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set. This is required for server-side actions.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    
    if (getApps().length === 0) {
      _firebaseAdminApp = initializeApp({
        credential: cert(serviceAccount),
      });
      console.log('[Firebase Admin] Initialized new app.');
    } else {
      _firebaseAdminApp = getApps()[0];
      console.log('[Firebase Admin] Using existing app.');
    }

    _adminDb = getFirestore(_firebaseAdminApp);
    _adminAuth = getAuth(_firebaseAdminApp);
    _adminMessaging = getMessaging(_firebaseAdminApp);

    return {
      adminApp: _firebaseAdminApp,
      adminDb: _adminDb,
      adminAuth: _adminAuth,
      adminMessaging: _adminMessaging,
    };
  } catch (error: any) {
    console.error('[Firebase Admin] CRITICAL: Failed to parse service account key or initialize app.', error.message);
    throw new Error('Failed to initialize Firebase Admin SDK. Check your service account credentials.');
  }
}
