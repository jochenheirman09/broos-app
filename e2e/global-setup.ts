
import 'dotenv/config';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { FullConfig } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });


async function globalSetup(config: FullConfig) {
  console.log('--- E2E Global Setup: Initializing Firebase Admin ---');

  if (!process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT) {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT environment variable is not set. This setup is intended for local E2E testing and requires admin credentials. It will not run in the Firebase Studio web terminal.');
  }

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
        clubId: null,
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
  console.log('--- E2E Global Setup: Complete ---');
}

export default globalSetup;
