
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';
import 'dotenv/config';

// Global instances for Firebase services, lazily initialized.
let adminApp: App | undefined;
let adminFirestore: Firestore | undefined;
let adminMessagingInstance: Messaging | undefined;

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (adminApp) {
    return;
  }
  
  if (getApps().length > 0) {
    console.log('[genkit.ts] Using existing Firebase Admin SDK instance.');
    adminApp = getApps()[0];
    return;
  }
  
  console.log('[genkit.ts] Initializing Firebase Admin SDK...');
  
  // Check if running in a Google Cloud environment (like App Hosting)
  if (process.env.GCLOUD_PROJECT) {
    console.log('[genkit.ts] Google Cloud environment detected. Using default credentials.');
    adminApp = initializeApp();
  } else {
    // Fallback for local development using the service account from .env
    const serviceAccountEnv = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
    if (serviceAccountEnv) {
      try {
        const serviceAccount = JSON.parse(serviceAccountEnv);
        adminApp = initializeApp({ credential: cert(serviceAccount) });
        console.log('[genkit.ts] Firebase Admin SDK initialized for LOCAL environment.');
      } catch (e: any) {
        console.error('[genkit.ts] FATAL: Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT.', e.stack);
        throw new Error("Could not initialize Firebase Admin SDK. Service account JSON is likely invalid.");
      }
    } else {
       console.warn('[genkit.ts] WARNING: Neither GCLOUD_PROJECT nor FIREBASE_ADMIN_SERVICE_ACCOUNT are set.');
       // Attempting default init as a last resort, which might fail locally.
       adminApp = initializeApp();
    }
  }
}

/**
 * A singleton getter for Firebase Admin services.
 * This avoids initializing the SDK multiple times.
 */
export function getFirebaseAdmin() {
    if (!adminApp) {
        initializeFirebaseAdmin();
    }
    if (!adminFirestore) {
        adminFirestore = getFirestore(adminApp);
    }
    if (!adminMessagingInstance) {
        adminMessagingInstance = getMessaging(adminApp);
    }

    return { adminDb: adminFirestore, adminMessaging: adminMessagingInstance };
}
