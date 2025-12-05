
'use server';

import { getFirebaseAdmin } from '@/ai/genkit';
import { serverTimestamp } from 'firebase-admin/firestore';
import type { UserProfile, NotificationInput } from '@/lib/types';
import { sendNotification } from '@/ai/flows/notification-flow';

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
        shareWithStaff?: boolean; // Added for consent
    };
    askForConsent?: boolean; // Added to handle consent flow
}

/**
 * Server action to save wellness data. It now saves alerts to the new
 * denormalized location and immediately triggers notifications to staff if consent is given.
 */
export async function saveWellnessData(payload: SavePayload) {
  const { userId, userMessage, assistantResponse, summary, wellnessScores, alert, askForConsent } = payload;
  
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
  
  // The main batch commit needs to happen before we can notify staff,
  // as we need to read data that has just been written.
  try {
    await batch.commit();
    console.log(`[Wellness Action] Initial batch write successful for user ${userId}.`);
  } catch (e: any) {
     console.error(`[Wellness Action] CRITICAL: Batch commit failed for user ${userId}:`, e);
     throw new Error(`Database write failed: ${e.message}`);
  }

  // 5. Handle Alert if present (AFTER initial batch)
  if (alert) {
      const userDoc = await userDocRef.get();
      const userData = userDoc.data() as UserProfile | undefined;
      const clubId = userData?.clubId;
      const teamId = userData?.teamId;

      if (!clubId || !teamId) {
          console.error(`[Wellness Action] Cannot save or notify for alert for user ${userId}: missing clubId or teamId.`);
          return; // Stop execution if we can't save the alert properly
      }
      
      const alertDocRef = adminDb.collection('clubs').doc(clubId).collection('teams').doc(teamId).collection('alerts').doc();
      const alertData = {
          alertType: alert.alertType,
          triggeringMessage: alert.triggeringMessage,
          id: alertDocRef.id,
          userId,
          clubId, // Denormalized for rules
          date: today,
          status: 'new',
          shareWithStaff: alert.shareWithStaff === true, // Ensure it's a boolean
          createdAt: serverTimestamp(),
      };
      await alertDocRef.set(alertData);
      console.log(`[Wellness Action] Alert of type '${alert.alertType}' saved for user ${userId}.`);

      // 6. Notify staff members ONLY IF consent is given and the AI is not asking for it now.
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
            // Fire-and-forget notification sending
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
