'use server';

import { getFirebaseAdmin } from '@/ai/genkit';
import { serverTimestamp } from 'firebase-admin/firestore';
import type { FullWellnessAnalysisOutput } from '@/lib/types';

// This interface defines a "flat" structure with only primitive types.
// It has NO DEPENDENCIES on Zod or other complex objects.
export interface SavePayload {
    userId: string;
    userMessage: string;
    assistantResponse: string;
    summary?: string;
    wellnessScores?: {
        mood?: number;
        moodReason?: string;
        stress?: number;
        stressReason?: string;
        sleep?: number;
        sleepReason?: string;
        motivation?: number;
        motivationReason?: string;
    };
    alert?: {
        alertType: 'Mental Health' | 'Aggression' | 'Substance Abuse' | 'Extreme Negativity';
        triggeringMessage: string;
    };
}

/**
 * Server action to save wellness data. It is now fully isolated and
 * only accepts a simple, flat payload object.
 */
export async function saveWellnessData(payload: SavePayload) {
  const { userId, userMessage, assistantResponse, summary, wellnessScores, alert } = payload;
  
  console.log(`[Wellness Action] Saving data for user ${userId}.`);
  const { adminDb } = await getFirebaseAdmin();
  const today = new Date().toISOString().split("T")[0];

  const batch = adminDb.batch();
  
  const userDocRef = adminDb.collection('users').doc(userId);
  const chatDocRef = userDocRef.collection('chats').doc(today);
  const messagesColRef = chatDocRef.collection('messages');
  
  // 1. Save user's message
  batch.set(messagesColRef.doc(), {
      role: 'user',
      content: userMessage,
      timestamp: serverTimestamp(),
  });

  // 2. Save assistant's response
  batch.set(messagesColRef.doc(), {
      role: 'assistant',
      content: assistantResponse,
      timestamp: serverTimestamp(),
  });

  // 3. Save Chat Summary if present
  if (summary) {
    batch.set(chatDocRef, {
        id: today,
        userId,
        date: today,
        summary: summary,
        updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  // 4. Save Wellness Scores if present
  if (wellnessScores && Object.keys(wellnessScores).length > 0) {
      const scoresDocRef = userDocRef.collection('wellnessScores').doc(today);
      const scoreData = {
        ...wellnessScores,
        id: today,
        date: today,
        updatedAt: serverTimestamp(),
      };
      batch.set(scoresDocRef, scoreData, { merge: true });
  }

  // 5. Save Alert if present
  if (alert) {
      const alertDocRef = userDocRef.collection('alerts').doc();
      const alertData = {
          ...alert,
          id: alertDocRef.id,
          userId,
          date: today,
          status: 'new',
          createdAt: serverTimestamp(),
      };
      batch.set(alertDocRef, alertData);
      console.log(`[Wellness Action] Alert of type '${alert.alertType}' saved for user ${userId}.`);
  }

  try {
    await batch.commit();
    console.log(`[Wellness Action] Batch write successful for user ${userId}.`);
  } catch (e: any) {
     console.error(`[Wellness Action] CRITICAL: Batch commit failed for user ${userId}:`, e);
     // Re-throw the error to be caught by the client-side .catch() block.
     throw new Error(`Database write failed: ${e.message}`);
  }
}
