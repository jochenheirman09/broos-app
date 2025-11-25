
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import 'dotenv/config';

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    console.log('[genkit.ts] Using existing Firebase Admin SDK instance.');
    return;
  }
  
  console.log('[genkit.ts] Initializing Firebase Admin SDK...');
  const serviceAccountEnv = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
  if (serviceAccountEnv) {
    try {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      initializeApp({ credential: cert(serviceAccount) });
      console.log('[genkit.ts] Firebase Admin SDK initialized SUCCESSFULLY.');
    } catch (e: any) {
      console.error('[genkit.ts] FATAL: Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT.', e.stack);
      throw new Error("Could not initialize Firebase Admin SDK. Service account JSON is likely invalid.");
    }
  } else {
    console.warn('[genkit.ts] WARNING: FIREBASE_ADMIN_SERVICE_ACCOUNT not set. Attempting default initialization (works in deployed environments).');
    initializeApp();
  }
}

// Initialize Admin SDK first
initializeFirebaseAdmin();

// Then configure Genkit
const ai = genkit({
  plugins: [
    googleAI(), // Removed the problematic apiVersion property
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

export const adminDb = getFirestore();
export const adminMessaging = getMessaging();
export { ai };
