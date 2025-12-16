
"use server";

import { Auth } from 'firebase-admin/auth';
import { Firestore } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from '@/ai/genkit';
import type { UserProfile } from '@/lib/types';

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
 * Reads a user's Firestore profile and sets their Firebase Auth Custom Claims.
 * This is a powerful recovery tool for users whose tokens are out of sync.
 */
async function repairUserClaims(userId: string): Promise<{ success: boolean, message: string }> {
    const { adminDb, adminAuth } = await getFirebaseAdmin();
    const userRef = adminDb.collection('users').doc(userId);
    
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        return { success: false, message: "Gebruikersprofiel niet gevonden in Firestore." };
    }

    const userProfile = userDoc.data() as UserProfile;
    
    const claims: { [key: string]: any } = {};
    
    if (userProfile.role) claims.role = userProfile.role;
    if (userProfile.clubId) claims.clubId = userProfile.clubId;
    if (userProfile.teamId) claims.teamId = userProfile.teamId;

    if (Object.keys(claims).length === 0) {
        return { success: true, message: "Geen claims om in te stellen, profiel is mogelijk incompleet." };
    }

    await adminAuth.setCustomUserClaims(userId, claims);
    
    const claimsString = JSON.stringify(claims);
    console.log(`[Repair Action] Successfully set claims for user ${userId}: ${claimsString}`);
    return { success: true, message: `Account hersteld! Claims (${claimsString}) zijn ingesteld. Log opnieuw in.` };
}
  
export async function handleRepairUserClaims(userId: string): Promise<{ success: boolean; message: string; }> {
    if (process.env.NODE_ENV === 'production') {
        return { success: false, message: "Forbidden: This action is not available in production." };
    }

    try {
        return await repairUserClaims(userId);
    } catch (error: any) {
        console.error("Repair user claims failed:", error);
        return {
        success: false,
        message: error.message || "An internal server error occurred during account repair.",
        };
    }
}
