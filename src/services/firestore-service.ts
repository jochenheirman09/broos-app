
'use server';

import { getFirebaseAdmin } from '@/ai/genkit';
import { FieldValue, type DocumentReference } from 'firebase-admin/firestore';
import type { OnboardingTopic, UserProfile, Game, FullWellnessAnalysisOutput } from '@/lib/types';

export async function saveOnboardingSummary(
    userRef: DocumentReference,
    topic: OnboardingTopic,
    data: { summary?: string, siblings?: any[], pets?: any[] },
    isLastTopic: boolean
) {
    const updateData: { [key: string]: any } = {};

    if (data.summary) {
        updateData[topic] = data.summary;
    }
    if (data.siblings && data.siblings.length > 0) {
        updateData.siblings = FieldValue.arrayUnion(...data.siblings);
    }
    if (data.pets && data.pets.length > 0) {
        updateData.pets = FieldValue.arrayUnion(...data.pets);
    }

    if (isLastTopic) {
        updateData.onboardingCompleted = true;
    }
    
    if (Object.keys(updateData).length === 0) return;

    try {
        await userRef.set(updateData, { merge: true });
        console.log(`[Firestore Service] Onboarding data for topic '${topic}' saved for user ${userRef.id}.`);
    } catch (e: any) {
        console.error(`Error updating onboarding data for user ${userRef.id} and topic ${topic}:`, e);
    }
}

export async function saveUserMessage(userId: string, today: string, userMessage: string) {
    console.log(`[Firestore Service] Saving user message for ${userId}.`);
    const { adminDb } = await getFirebaseAdmin();
    const messagesColRef = adminDb.collection('users').doc(userId).collection('chats').doc(today).collection('messages');
    const clientTimestampMs = Date.now();
    await messagesColRef.add({
        role: 'user',
        content: userMessage,
        timestamp: FieldValue.serverTimestamp(),
        sortOrder: clientTimestampMs,
    });
}


// This interface is now for the *second* part of the save operation
export interface SaveAssistantPayload {
    userId: string;
    assistantResponse: string;
    summary?: string;
    wellnessScores?: FullWellnessAnalysisOutput['wellnessScores'];
    alert?: FullWellnessAnalysisOutput['alert'];
    askForConsent?: boolean;
    gameUpdate?: FullWellnessAnalysisOutput['gameUpdate'];
}

/**
 * Saves the assistant's response and all AI-extracted data.
 * The user's message is now saved separately and before this function is called.
 */
export async function saveAssistantResponse(payload: SaveAssistantPayload) {
  const { userId, assistantResponse, summary, wellnessScores, alert, askForConsent, gameUpdate } = payload;
  
  console.log(`[Firestore Service] Saving assistant response & data for user ${userId}.`);
  const { adminDb } = await getFirebaseAdmin();
  const today = new Date().toISOString().split('T')[0];

  const batch = adminDb.batch();
  
  const userDocRef = adminDb.collection('users').doc(userId);
  const chatDocRef = userDocRef.collection('chats').doc(today);
  const messagesColRef = chatDocRef.collection('messages');
  
  // 1. Save assistant's response
  console.log("[Firestore Service] Queuing assistant response save.");
  const clientTimestampMs = Date.now() + 1; // Ensure it's after user message
  const assistantMessageRef = messagesColRef.doc(); // Generate a new doc ref
  batch.set(assistantMessageRef, {
      role: 'assistant',
      content: assistantResponse,
      timestamp: FieldValue.serverTimestamp(),
      sortOrder: clientTimestampMs,
  });

  // 2. Save Chat Summary if present
  if (summary) {
    console.log("[Firestore Service] Queuing chat summary save.");
    batch.set(chatDocRef, {
        id: today,
        userId,
        date: today,
        summary: summary,
        updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  }

  // 3. Save Wellness Scores if present
  if (wellnessScores && Object.keys(wellnessScores).length > 0) {
    console.log("[Firestore Service] Queuing wellness scores save. Payload:", wellnessScores);
    const scoresDocRef = userDocRef.collection('wellnessScores').doc(today);
    const scoreData = {
      ...(wellnessScores || {}),
      id: today,
      date: today,
      updatedAt: FieldValue.serverTimestamp(),
    };
    batch.set(scoresDocRef, scoreData, { merge: true });
  }
  
  // 4. Save Game Data if present
  if (gameUpdate && Object.keys(gameUpdate).length > 0) {
    console.log("[Firestore Service] Queuing game data update. Payload:", gameUpdate);
    const gameDocRef = userDocRef.collection('games').doc(today);
    const gameData = {
        ...gameUpdate,
        updatedAt: FieldValue.serverTimestamp(),
    };
    batch.set(gameDocRef, gameData, { merge: true });
  }

  // 5. Handle Alert if present
  if (alert) {
      const userDoc = await userDocRef.get();
      const userData = userDoc.data() as UserProfile | undefined;
      const clubId = userData?.clubId;
      const teamId = userData?.teamId;

      if (!clubId || !teamId) {
          console.error(`[Firestore Service] Cannot save alert for user ${userId}: missing clubId or teamId.`);
      } else {
          const alertDocRef = adminDb.collection('clubs').doc(clubId).collection('teams').doc(teamId).collection('alerts').doc();
          const alertData = {
              alertType: alert.alertType,
              triggeringMessage: alert.triggeringMessage,
              id: alertDocRef.id,
              userId,
              clubId,
              teamId, // Denormalize for staff queries
              date: today,
              status: 'new',
              shareWithStaff: alert.shareWithStaff === true,
              createdAt: FieldValue.serverTimestamp(),
          };
          batch.set(alertDocRef, alertData);
          console.log(`[Firestore Service] Queued alert of type '${alert.alertType}' for user ${userId}.`);
      }
  }
  
  // Commit the batch
  try {
    await batch.commit();
    console.log(`[Firestore Service] Batch write successful for user ${userId}.`);
  } catch (e: any) {
     console.error(`[Firestore Service] CRITICAL: Batch commit failed for user ${userId}:`, e);
     throw new Error(`Database write failed: ${e.message}`);
  }
}
