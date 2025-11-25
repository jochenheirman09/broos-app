
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import 'dotenv/config';

// NOTE: This setup script is designed to run in a local Node.js environment
// before the Playwright tests start. It will fail in the Firebase Studio
// browser-based environment because it requires Node.js APIs and access to
// a service account key via environment variables.

async function globalSetup() {
  console.log('--- E2E Global Setup: Initializing Firebase Admin ---');

  // Ensure the service account key is available in the environment variables.
  // This is the primary guard against running in an unsupported environment.
  if (!process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set. This setup is intended for local E2E testing and requires admin credentials. It will not run in the Firebase Studio web terminal.');
  }

  // Initialize Firebase Admin SDK if not already initialized.
  if (!getApps().length) {
    try {
      initializeApp({
        credential: cert(JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT)),
      });
    } catch (error: any) {
        console.error('Failed to initialize Firebase Admin SDK. Make sure your FIREBASE_ADMIN_SERVICE_ACCOUNT is a valid JSON string.');
        throw error;
    }
  }
  
  const auth = getAuth();
  const db = getFirestore();

  console.log('--- E2E Global Setup: Seeding Test Database ---');
  
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

  // Store credentials to be used by tests for logging in via the UI.
  process.env.E2E_PLAYER_EMAIL = testUsers.player.email;
  process.env.E2E_STAFF_EMAIL = testUsers.staff.email;
  process.env.E2E_RESPONSIBLE_EMAIL = testUsers.responsible.email;
  process.env.E2E_PASSWORD = 'password123';


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
        onboardingCompleted: false,
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

  // The setup is complete. Tests will now run and use the credentials
  // stored in process.env to log in through the application's UI.
  console.log('--- E2E Global Setup: Complete ---');
}

export default globalSetup;
