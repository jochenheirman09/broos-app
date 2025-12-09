
'use server';

import { getFirebaseAdmin } from '@/ai/genkit';
import { type DocumentReference, FieldValue } from 'firebase-admin/firestore';
import type { OnboardingTopic, UserProfile, Game } from '@/lib/types';
import { formatInTimeZone } from 'date-fns-tz';

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


// This interface is now for the *second* part of the save operation
export interface SaveAssistantPayload {
    userId: string;
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
        shareWithStaff?: boolean;
    };
    askForConsent?: boolean;
    gameUpdate?: Partial<Omit<Game, 'id' | 'userId' | 'date' | 'createdAt' | 'updatedAt'>>;
}

/**
 * Saves the assistant's response and all AI-extracted data.
 * The user's message is now saved separately and before this function is called.
 */
export async function saveAssistantResponse(payload: SaveAssistantPayload) {
  const { userId, assistantResponse, summary, wellnessScores, alert, askForConsent, gameUpdate } = payload;
  
  console.log(`[Wellness Service] Saving assistant response & data for user ${userId}.`);
  const { adminDb } = await getFirebaseAdmin();
  const today = formatInTimeZone(new Date(), 'Europe/Brussels', "yyyy-MM-dd");

  const batch = adminDb.batch();
  
  const userDocRef = adminDb.collection('users').doc(userId);
  const chatDocRef = userDocRef.collection('chats').doc(today);
  const messagesColRef = chatDocRef.collection('messages');
  
  // 1. Save assistant's response
  console.log("[Wellness Service] Queuing assistant response save.");
  const clientTimestampMs = Date.now();
  batch.set(messagesColRef.doc(), {
      role: 'assistant',
      content: assistantResponse,
      timestamp: FieldValue.serverTimestamp(),
      sortOrder: clientTimestampMs + 1, // Ensure it's after the user message
  });

  // 2. Save Chat Summary if present
  if (summary) {
    console.log("[Wellness Service] Queuing chat summary save.");
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
    console.log("[Wellness Service] Queuing wellness scores save. Payload:", wellnessScores);
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
    console.log("[Wellness Service] Queuing game data update. Payload:", gameUpdate);
    const gameDocRef = userDocRef.collection('games').doc(today);
    const gameData = {
        ...gameUpdate,
        updatedAt: FieldValue.serverTimestamp(),
    };
    batch.set(gameDocRef, gameData, { merge: true });
  }

  // Commit the first batch for AI data
  try {
    await batch.commit();
    console.log(`[Wellness Service] Assistant response batch write successful for user ${userId}.`);
  } catch (e: any) {
     console.error(`[Wellness Service] CRITICAL: Assistant response batch commit failed for user ${userId}:`, e);
     throw new Error(`Database write failed for assistant response: ${e.message}`);
  }

  // 5. Handle Alert separately after other data is saved
  if (alert) {
      const userDoc = await userDocRef.get();
      const userData = userDoc.data() as UserProfile | undefined;
      const clubId = userData?.clubId;
      const teamId = userData?.teamId;

      if (!clubId || !teamId) {
          console.error(`[Wellness Service] Cannot save alert for user ${userId}: missing clubId or teamId.`);
          return; 
      }
      
      const alertDocRef = adminDb.collection('clubs').doc(clubId).collection('teams').doc(teamId).collection('alerts').doc();
      const alertData = {
          alertType: alert.alertType,
          triggeringMessage: alert.triggeringMessage,
          id: alertDocRef.id,
          userId,
          clubId,
          date: today,
          status: 'new',
          shareWithStaff: alert.shareWithStaff === true,
          createdAt: FieldValue.serverTimestamp(),
      };
      await alertDocRef.set(alertData);
      console.log(`[Wellness Service] Alert of type '${alert.alertType}' saved for user ${userId}.`);
  }
}
