
'use server';

import { getFirebaseAdmin } from '@/ai/genkit';
import { runOnboardingFlow } from '@/ai/flows/onboarding-flow';
import { runWellnessAnalysisFlow } from '@/ai/flows/wellness-analysis-flow';
import type { UserProfile, WellnessAnalysisInput, ScheduleActivity, OnboardingOutput } from '@/lib/types';
import { GenkitError } from 'genkit';
import { format, getDay } from 'date-fns';
import { saveOnboardingSummary } from '@/services/firestore-service';

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
 * It now handles the transition between flows seamlessly.
 */
export async function chatWithBuddy(
  userId: string,
  input: WellnessAnalysisInput
) {
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
    let userProfile = userDoc.data() as UserProfile;

    // --- Onboarding Logic ---
    if (!userProfile.onboardingCompleted) {
      console.log('[Chat Action] Routing to onboarding flow.');
      const onboardingResult = await runOnboardingFlow(userRef, userProfile, input);

      // Check if this was the last onboarding step
      if (onboardingResult.isTopicComplete && onboardingResult.isLastTopic) {
        console.log('[Chat Action] Final onboarding step completed. Transitioning to wellness flow...');
        
        // Save the final summary
        if (onboardingResult.summary && onboardingResult.lastTopic) {
            await saveOnboardingSummary(userRef, userProfile, onboardingResult.lastTopic, onboardingResult.summary);
        }

        // We need an updated user profile to confirm onboarding is complete
        const updatedUserDoc = await userRef.get();
        userProfile = updatedUserDoc.data() as UserProfile;

        // Construct an updated history for the wellness flow
        const updatedHistory = (input.chatHistory ? input.chatHistory + "\n" : "") + 
                               `user: ${input.userMessage}\n` +
                               `assistant: ${onboardingResult.response}`;
        
        const wellnessInput: WellnessAnalysisInput = {
            ...input,
            userMessage: "Oké, top. Waar zullen we het dan nu over hebben?", // A generic prompt to kick off the wellness part
            chatHistory: updatedHistory,
        };

        // Immediately call the wellness flow within the same action
        return await runWellnessAnalysisFlow(userRef, userProfile, wellnessInput);
      }
      
      // If not the last step, just return the onboarding response
      return onboardingResult;
    } 
    
    // --- Wellness Analysis Logic (if onboarding is already complete) ---
    console.log('[Chat Action] Routing to wellness analysis flow.');
    
    let todayActivity: ScheduleActivity | 'individual' = 'rest';
    const now = new Date();
    const todayId = format(now, "yyyy-MM-dd");
    const dayName = dayMapping[getDay(now)];
    const currentTime = format(now, "HH:mm");

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
    
    const enrichedInput = { ...input, todayActivity, currentTime };

    return await runWellnessAnalysisFlow(userRef, userProfile, enrichedInput);

  } catch (error: any) {
    console.error("[Chat Action] Error in chatWithBuddy:", error.message);
    if (error.message && (error.message.includes('503') || error.message.toLowerCase().includes('overloaded'))) {
      return {
        error: 'service_unavailable',
        response: "Mijn excuses, ik heb het even te druk. Probeer het over een momentje opnieuw.",
      };
    }
    throw error;
  }
}
