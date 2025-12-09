
"use server";

import { Auth } from 'firebase-admin/auth';
import { Firestore } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/ai/genkit';

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

/**
 * Deletes a single user's data from Firestore, including all subcollections.
 * @param db Firestore instance.
 * @param userId The UID of the user to delete.
 */
async function deleteUserFirestoreData(db: Firestore, userId: string): Promise<void> {
    const userRef = db.doc(`users/${userId}`);
    const subcollections = await userRef.listCollections();
    for (const subcollection of subcollections) {
      await deleteCollection(db, subcollection.path);
    }
    await userRef.delete();
}


async function cleanupDatabase(): Promise<{
  deletedUsers: number;
  deletedClubs: number;
}> {
  const { adminDb: db } = await getFirebaseAdmin();
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
    await deleteUserFirestoreData(db, userDoc.id);
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


/**
 * Deletes users from Firebase Auth and their data from Firestore if their email
 * does not end with a whitelisted domain.
 */
async function conditionalUserCleanup(db: Firestore, auth: Auth): Promise<{ deletedCount: number }> {
    const allowedDomains = ["@gmail.com", "@hotmail.com"];
    let nextPageToken;
    const uidsToDelete: string[] = [];
  
    // List all users from Firebase Auth
    while (true) {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      listUsersResult.users.forEach(user => {
        if (user.email) {
          const isAllowed = allowedDomains.some(domain => user.email!.endsWith(domain));
          if (!isAllowed) {
            uidsToDelete.push(user.uid);
          }
        }
      });
  
      if (!listUsersResult.pageToken) {
        break;
      }
      nextPageToken = listUsersResult.pageToken;
    }
  
    if (uidsToDelete.length === 0) {
      return { deletedCount: 0 };
    }
  
    // Delete from Firebase Auth (max 1000 at a time)
    await auth.deleteUsers(uidsToDelete);
  
    // Delete from Firestore
    for (const uid of uidsToDelete) {
      await deleteUserFirestoreData(db, uid);
    }
  
    return { deletedCount: uidsToDelete.length };
}
  
export async function handleConditionalUserCleanup(): Promise<{ success: boolean; message: string; }> {
    if (process.env.NODE_ENV === 'production') {
        return { success: false, message: "Forbidden: This action is not available in production." };
    }

    try {
        const { adminDb, adminAuth } = await getFirebaseAdmin();
        const { deletedCount } = await conditionalUserCleanup(adminDb, adminAuth);
        return {
        success: true,
        message: `${deletedCount} gebruikers verwijderd die niet eindigen op gmail.com of hotmail.com.`,
        };
    } catch (error: any) {
        console.error("Conditional user cleanup failed:", error);
        return {
        success: false,
        message: error.message || "An internal server error occurred during conditional cleanup.",
        };
    }
}

/**
 * Finds users who are stuck in onboarding and marks them as complete.
 */
async function fixStuckOnboarding(): Promise<{ fixedCount: number }> {
    const { adminDb: db } = await getFirebaseAdmin();
    let fixedCount = 0;

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('onboardingCompleted', '==', false).get();

    if (snapshot.empty) {
        return { fixedCount: 0 };
    }

    for (const doc of snapshot.docs) {
        const user = doc.data();
        // We only fix users who have already started chatting, indicating they are stuck.
        const chatsRef = doc.ref.collection('chats');
        const chatSnapshot = await chatsRef.limit(1).get();
        
        if (!chatSnapshot.empty) {
            console.log(`Fixing user ${user.uid} (${user.name})...`);
            await doc.ref.update({ onboardingCompleted: true });
            fixedCount++;
        }
    }

    return { fixedCount };
}

export async function handleFixStuckOnboarding(): Promise<{ success: boolean; message: string; }> {
    if (process.env.NODE_ENV === 'production') {
        return { success: false, message: "Forbidden: This action is not available in production." };
    }

    try {
        const { fixedCount } = await fixStuckOnboarding();
        return {
        success: true,
        message: `${fixedCount} gebruikers die vastzaten in onboarding zijn gerepareerd.`,
        };
    } catch (error: any) {
        console.error("Fixing stuck onboarding failed:", error);
        return {
        success: false,
        message: error.message || "An internal server error occurred during the fix.",
        };
    }
}
