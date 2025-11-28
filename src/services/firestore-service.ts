
'use server';

import { getFirebaseAdmin } from '@/ai/genkit';
import { type DocumentReference, serverTimestamp } from 'firebase-admin/firestore';
import type { OnboardingTopic, UserProfile, FullWellnessAnalysisOutput } from '@/lib/types';


export async function saveOnboardingSummary(
    userRef: DocumentReference,
    userProfile: UserProfile,
    topic: OnboardingTopic,
    summary: string,
) {
    const updateData = {
        [topic]: summary,
    };

    const isLastTopic = topic === 'additionalHobbies';
    if (isLastTopic) {
        (updateData as UserProfile).onboardingCompleted = true;
    }

    try {
        await userRef.update(updateData);
        console.log(`[Firestore Service] Onboarding summary for topic '${topic}' saved for user ${userRef.id}.`);
        if (isLastTopic) {
            console.log(`[Firestore Service] Onboarding marked as complete for user ${userRef.id}.`);
        }
    } catch (e: any) {
        console.error(`Error updating onboarding summary for user ${userRef.id} and topic ${topic}:`, e);
    }
}

/**
 * @deprecated This function is now superseded by the isolated server action
 * in `src/app/actions/wellness-actions.ts`. This is kept temporarily for reference
 * but should be removed in the future.
 */
export async function saveWellnessData(
  userId: string,
  output: FullWellnessAnalysisOutput,
  userMessage: string
) {
  console.log(`[Firestore Service] Saving wellness data for user ${userId}.`);
  const { adminDb } = await getFirebaseAdmin();
  const today = new Date();
  const todayId = today.toISOString().split("T")[0];

  const batch = adminDb.batch();

  const userDocRef = adminDb.collection('users').doc(userId);
  const chatDocRef = userDocRef.collection('chats').doc(todayId);
  const messagesColRef = chatDocRef.collection('messages');
  
  // 1. Save Chat Summary
  if (output.summary) {
    batch.set(chatDocRef, {
        id: todayId,
        userId,
        date: todayId,
        summary: output.summary,
        updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  // 2. Save Chat Messages (user's input and AI's response) are now handled on the client.
  
  // 3. Save Wellness Scores if present
  if (output.wellnessScores && Object.keys(output.wellnessScores).length > 0) {
      const scoresDocRef = userDocRef.collection('wellnessScores').doc(todayId);
      const scoreData = {
        ...output.wellnessScores,
        id: todayId,
        date: todayId,
        updatedAt: serverTimestamp(),
      };
      batch.set(scoresDocRef, scoreData, { merge: true });
  }

  // 4. Save Alert if present
  if (output.alert) {
      const alertDocRef = userDocRef.collection('alerts').doc();
      const alertData = {
          ...output.alert,
          id: alertDocRef.id,
          userId,
          date: todayId,
          status: 'new',
          createdAt: serverTimestamp(),
      };
      batch.set(alertDocRef, alertData);
      console.log(`[Firestore Service] Alert of type '${output.alert.alertType}' saved for user ${userId}.`);
  }

  try {
    await batch.commit();
    console.log(`[Firestore Service] Batch write successful for user ${userId}.`);
  } catch (e: any) {
     console.error(`[Firestore Service] CRITICAL: Batch commit failed for user ${userId}:`, e);
  }
}
