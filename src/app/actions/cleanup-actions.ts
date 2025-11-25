
"use server";

import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

// This function is now self-contained within the server action file.
function initializeAndGetDB(): Firestore {
  if (getApps().length) {
    console.log('[CLEANUP_ACTION] Using existing Firebase Admin SDK instance.');
    return getFirestore();
  }

  console.log('[CLEANUP_ACTION] Initializing Firebase Admin SDK for Cleanup Action...');
  const serviceAccountEnv = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;

  if (serviceAccountEnv) {
    try {
      const serviceAccount = JSON.parse(serviceAccountEnv);
      initializeApp({ credential: cert(serviceAccount) });
      console.log('[CLEANUP_ACTION] Firebase Admin SDK initialized SUCCESSFULLY.');
      return getFirestore();
    } catch (e: any) {
      console.error('[CLEANUP_ACTION] FATAL: Failed to parse FIREBASE_ADMIN_SERVICE_ACCOUNT.', e.stack);
      throw new Error("Could not initialize Firebase Admin SDK. Service account JSON is likely invalid.");
    }
  } else {
    console.error('[CLEANUP_ACTION] FATAL: FIREBASE_ADMIN_SERVICE_ACCOUNT not found in .env.');
    throw new Error("Firebase Admin Service Account is not configured in environment variables.");
  }
}

async function deleteCollection(
  db: Firestore,
  collectionPath: string,
  batchSize: number = 100
): Promise<number> {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);
  let deletedCount = 0;

  while (true) {
    const snapshot = await query.get();
    if (snapshot.size === 0) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    deletedCount += snapshot.size;
  }
  return deletedCount;
}

async function cleanupDatabase(): Promise<{
  deletedUsers: number;
  deletedClubs: number;
}> {
  const db = initializeAndGetDB();
  let deletedUsers = 0;
  let deletedClubs = 0;

  // --- Clean up Clubs and their subcollections ---
  const clubsSnapshot = await db.collection('clubs').get();
  for (const clubDoc of clubsSnapshot.docs) {
    const subcollections = await clubDoc.ref.listCollections();
    for (const subcollection of subcollections) {
      await deleteCollection(db, subcollection.path);
    }
    await clubDoc.ref.delete();
    deletedClubs++;
  }

  // --- Clean up Users and their subcollections ---
  const usersSnapshot = await db.collection('users').get();
  for (const userDoc of usersSnapshot.docs) {
    const subcollections = await userDoc.ref.listCollections();
    for (const subcollection of subcollections) {
      await deleteCollection(db, subcollection.path);
    }
    await userDoc.ref.delete();
    deletedUsers++;
  }
  
  console.log(`Cleanup complete. Deleted ${deletedUsers} users and ${deletedClubs} clubs.`);
  return { deletedUsers, deletedClubs };
}

export async function handleCleanup(): Promise<{ success: boolean; message: string; }> {
  if (process.env.NODE_ENV === 'production') {
    return {
      success: false,
      message: "Forbidden: This action is not available in production.",
    };
  }

  try {
    const { deletedUsers, deletedClubs } = await cleanupDatabase();
    return {
      success: true,
      message: `Database opgeruimd. ${deletedUsers} gebruikers en ${deletedClubs} clubs verwijderd.`,
    };
  } catch (error: any) {
    console.error("Server Action Cleanup failed:", error);
    return {
      success: false,
      message: error.message || "An internal server error occurred during cleanup.",
    };
  }
}
