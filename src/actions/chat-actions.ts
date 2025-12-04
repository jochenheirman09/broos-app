'use server';

import { getFirebaseAdmin } from '@/ai/genkit';
import { runOnboardingFlow } from '@/ai/flows/onboarding-flow';
import { runWellnessAnalysisFlow } from '@/ai/flows/wellness-analysis-flow';
import type { UserProfile, WellnessAnalysisInput, ScheduleActivity } from '@/lib/types';
import { GenkitError } from 'genkit';
import { format, getDay } from 'date-fns';

const dayMapping: { [key: number]: keyof UserProfile['schedule'] } = {
  0: 'sunday',
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
  6: 'saturday',
};

/**
 * Main controller for handling chat interactions.
 * This server action acts as a router, determining whether to invoke the
 * onboarding flow or the regular wellness analysis flow based on the user's profile.
 * It also enriches the input with the player's activity for the day.
 *
 * @param userId The ID of the user initiating the chat.
 * @param input The basic chat input from the client.
 * @returns The output from either the onboarding or wellness analysis flow, or an error object.
 */
export async function chatWithBuddy(
  userId: string,
  input: WellnessAnalysisInput
) {
  // Insurance Policy: Check for API Key
  if (!process.env.GEMINI_API_KEY) {
    console.error("[Chat Action] CRITICAL: GEMINI_API_KEY is not set.");
    return {
      error: 'configuration_error',
      response: "Mijn excuses, ik kan momenteel niet functioneren omdat mijn configuratie onvolledig is. Neem contact op met de beheerder.",
    };
  }

  console.log('[Chat Action] chatWithBuddy invoked for user:', userId);
  
  try {
    const { adminDb } = await getFirebaseAdmin();

    const userRef = adminDb.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new GenkitError({ status: 'NOT_FOUND', message: 'User profile not found.' });
    }
    const userProfile = userDoc.data() as UserProfile;

    let todayActivity: ScheduleActivity | 'individual' = 'rest';
    const today = new Date();
    const todayId = format(today, "yyyy-MM-dd");
    const dayName = dayMapping[getDay(today)];

    const individualTrainingQuery = userRef.collection('trainings').where('date', '==', todayId).limit(1);
    const individualTrainingSnapshot = await individualTrainingQuery.get();

    if (!individualTrainingSnapshot.empty) {
      todayActivity = 'individual';
    } else if (userProfile.teamId && userProfile.clubId) {
      const teamDocRef = adminDb.collection('clubs').doc(userProfile.clubId).collection('teams').doc(userProfile.teamId);
      const teamDoc = await teamDocRef.get();
      if (teamDoc.exists) {
        const teamData = teamDoc.data();
        if (teamData?.schedule && teamData.schedule[dayName]) {
          todayActivity = teamData.schedule[dayName];
        }
      }
    }

    const enrichedInput = { ...input, todayActivity };

    if (!userProfile.onboardingCompleted) {
      console.log('[Chat Action] Routing to onboarding flow.');
      return await runOnboardingFlow(userRef, userProfile, enrichedInput);
    } else {
      console.log('[Chat Action] Routing to wellness analysis flow.');
      return await runWellnessAnalysisFlow(userRef, userProfile, enrichedInput);
    }
  } catch (error: any) {
    console.error("[Chat Action] Error in chatWithBuddy:", error.message);
    if (error.message && (error.message.includes('503') || error.message.toLowerCase().includes('overloaded'))) {
      return {
        error: 'service_unavailable',
        response: "Mijn excuses, ik heb het even te druk. Probeer het over een momentje opnieuw.",
      };
    }
    // For other errors, re-throw to let the client handle a generic failure.
    throw error;
  }
}
