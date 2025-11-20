import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { credential } from 'firebase-admin';

async function globalSetup() {
  // Ensure Firebase Admin SDK is initialized
  if (!getApps().length) {
    const serviceAccountJson = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set. Please add it to your .env file.');
    }
    
    try {
      const serviceAccount = JSON.parse(serviceAccountJson);
      initializeApp({
        credential: credential.cert(serviceAccount),
      });
    } catch (e) {
      throw new Error(`Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT. Make sure it's a valid JSON string. Error: ${e}`);
    }
  }
}

export default globalSetup;
