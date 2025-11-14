import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { promises as fs } from 'fs';
import path from 'path';
import 'dotenv/config';

// Path to the JSON file where authentication state will be stored.
const storageStatePath = path.join(__dirname, 'storageState.json');

async function globalSetup() {
  console.log('--- E2E Global Setup: Initializing Firebase Admin ---');

  // Ensure the service account key is available in the environment variables.
  if (!process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set. Cannot run E2E tests.');
  }

  // Initialize Firebase Admin SDK if not already initialized.
  if (!getApps().length) {
    initializeApp({
      credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT)),
    });
  }
  
  const auth = getAuth();
  const db = getFirestore();

  console.log('--- E2E Global Setup: Creating Test Users ---');
  
  // Define test user credentials.
  const timestamp = Date.now();
  const testUsers = {
    player: {
      email: `player.${timestamp}@example.com`,
      password: 'password123',
      name: 'Test Player',
      role: 'player',
      gender: 'male'
    },
    staff: {
      email: `staff.${timestamp}@example.com`,
      password: 'password123',
      name: 'Test Staff',
      role: 'staff',
      gender: 'male'
    },
    responsible: {
      email: `responsible.${timestamp}@example.com`,
      password: 'password123',
      name: 'Test Responsible',
      role: 'responsible',
      gender: 'female'
    }
  };

  // Create users in Firebase Auth and corresponding documents in Firestore.
  for (const user of Object.values(testUsers)) {
    try {
      const userRecord = await auth.createUser({
        email: user.email,
        password: user.password,
        displayName: user.name,
        emailVerified: true,
      });

      await db.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: user.email,
        name: user.name,
        role: user.role,
        gender: user.gender,
        emailVerified: true,
      });
      console.log(`Created test user: ${user.email}`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-exists') {
        console.warn(`Test user ${user.email} already exists. Skipping creation.`);
      } else {
        console.error(`Failed to create test user ${user.email}:`, error);
        throw error;
      }
    }
  }

  // We'll use the 'responsible' user to log in for the tests.
  const authState = {
    email: testUsers.responsible.email,
    password: testUsers.responsible.password,
  };

  // A helper function to log in with a custom token (more robust than password).
  const loginWithCustomToken = async () => {
    const userRecord = await auth.getUserByEmail(testUsers.responsible.email);
    const customToken = await auth.createCustomToken(userRecord.uid);
    
    // IMPORTANT: This part needs to be executed in the browser context.
    // Since this script runs in Node.js, we can't directly use the client-side `signInWithCustomToken`.
    // Instead, we will save the user's credentials to a file. The tests will
    // then use these credentials to log in via the UI, which is a more realistic E2E scenario.
  };

  // For simplicity and realism, we will not use custom tokens in this setup.
  // Instead, we'll store credentials for the test runner. Playwright will handle
  // the login flow through the UI, which is what we want to test.
  
  // NOTE: Storing plain text passwords is not ideal for production, but it's
  // acceptable for a temporary, isolated E2E test environment. The proper way
  // would involve a more complex setup using custom tokens, which is beyond
  // the scope of this initial setup.

  // We are not writing a storageState.json file because the login
  // will be performed through the UI in each test. This ensures the login flow
  // itself is tested. We are now ready to run the tests.

  console.log('--- E2E Global Setup: Complete ---');
}

export default globalSetup;
