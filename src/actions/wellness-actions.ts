
'use server';

import { getFirebaseAdmin } from '@/ai/genkit';
import { serverTimestamp } from 'firebase-admin/firestore';
import type { UserProfile, NotificationInput, Game } from '@/lib/types';
import { sendNotification } from '@/ai/flows/notification-flow';
import { formatInTimeZone } from 'date-fns-tz';

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
        shareWithStaff?: boolean;
    };
    askForConsent?: boolean;
    gameUpdate?: Partial<Omit<Game, 'id' | 'userId' | 'date' | 'createdAt' | 'updatedAt'>>;
}

export async function saveWellnessData(payload: SavePayload) {
  const { userId, userMessage, assistantResponse, summary, wellnessScores, alert, askForConsent, gameUpdate } = payload;
  
  console.log(`[Wellness Action] Saving data for user ${userId}.`);
  const { adminDb } = await getFirebaseAdmin();
  const today = formatInTimeZone(new Date(), 'Europe/Brussels', "yyyy-MM-dd");

  const batch = adminDb.batch();
  
  const userDocRef = adminDb.collection('users').doc(userId);
  const chatDocRef = userDocRef.collection('chats').doc(today);
  const messagesColRef = chatDocRef.collection('messages');
  
  // 1. Save user's message
  console.log("[Wellness Action] Queuing user message save.");
  batch.set(messagesColRef.doc(), {
      role: 'user',
      content: userMessage,
      timestamp: serverTimestamp(),
  });

  // 2. Save assistant's response
  console.log("[Wellness Action] Queuing assistant response save.");
  batch.set(messagesColRef.doc(), {
      role: 'assistant',
      content: assistantResponse,
      timestamp: serverTimestamp(),
  });

  // 3. Save Chat Summary if present
  if (summary) {
    console.log("[Wellness Action] Queuing chat summary save.");
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
    console.log("[Wellness Action] Queuing wellness scores save. Payload:", wellnessScores);
    const scoresDocRef = userDocRef.collection('wellnessScores').doc(today);
    const scoreData = {
      ...(wellnessScores || {}),
      id: today,
      date: today,
      updatedAt: serverTimestamp(),
    };
    batch.set(scoresDocRef, scoreData, { merge: true });
  }
  
  // 5. Save Game Data if present
  if (gameUpdate && Object.keys(gameUpdate).length > 0) {
    console.log("[Wellness Action] Queuing game data update. Payload:", gameUpdate);
    const gameDocRef = userDocRef.collection('games').doc(today);
    const gameData = {
        ...gameUpdate,
        updatedAt: serverTimestamp(),
    };
    // Use set with merge to either create or update the game document for the day
    batch.set(gameDocRef, gameData, { merge: true });
  }

  try {
    await batch.commit();
    console.log(`[Wellness Action] Initial batch write successful for user ${userId}.`);
  } catch (e: any) {
     console.error(`[Wellness Action] CRITICAL: Batch commit failed for user ${userId}:`, e);
     throw new Error(`Database write failed: ${e.message}`);
  }

  if (alert) {
      const userDoc = await userDocRef.get();
      const userData = userDoc.data() as UserProfile | undefined;
      const clubId = userData?.clubId;
      const teamId = userData?.teamId;

      if (!clubId || !teamId) {
          console.error(`[Wellness Action] Cannot save or notify for alert for user ${userId}: missing clubId or teamId.`);
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
          createdAt: serverTimestamp(),
      };
      await alertDocRef.set(alertData);
      console.log(`[Wellness Action] Alert of type '${alert.alertType}' saved for user ${userId}.`);

      if (alert.shareWithStaff === true && !askForConsent) {
        const staffQuery = adminDb.collection('users').where('teamId', '==', teamId).where('role', '==', 'staff');
        const staffSnapshot = await staffQuery.get();
        
        if (!staffSnapshot.empty) {
          console.log(`[Wellness Action] Found ${staffSnapshot.size} staff members to notify for team ${teamId}.`);
          for (const staffDoc of staffSnapshot.docs) {
            const staffProfile = staffDoc.data() as UserProfile;
            const notificationInput: NotificationInput = {
                userId: staffProfile.uid,
                title: `Nieuwe Alert: ${userData?.name || 'een speler'}`,
                body: `Type: ${alert.alertType}. Bekijk de details in het dashboard.`,
                link: '/alerts'
            };
            sendNotification(notificationInput).catch(err => console.error(`Failed to send alert notification to staff ${staffProfile.uid}:`, err));
          }
        } else {
          console.log(`[Wellness Action] No staff members found for team ${teamId} to notify about the alert.`);
        }
      } else {
          console.log(`[Wellness Action] Alert saved, but not notifying staff. shareWithStaff: ${alert.shareWithStaff}, askForConsent: ${askForConsent}`);
      }
  }
}
