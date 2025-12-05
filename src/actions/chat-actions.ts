
'use server';

import { getFirebaseAdmin } from '@/ai/genkit';
import { runOnboardingFlow } from '@/ai/flows/onboarding-flow';
import { runWellnessAnalysisFlow } from '@/ai/flows/wellness-analysis-flow';
import { generatePlayerUpdate } from '@/ai/flows/player-update-flow';
import { analyzeTeamData } from '@/ai/flows/team-analysis-flow';
import type { UserProfile, WellnessAnalysisInput, OnboardingOutput, PlayerUpdateInput, PlayerUpdate, TeamAnalysisInput } from '@/lib/types';
import { GenkitError } from 'genkit';
import { format, getDay } from 'date-fns';
import { AITeamSummary } from '@/ai/types';

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

    // --- Onboarding Logic ---
    if (!userProfile.onboardingCompleted) {
      console.log('[Chat Action] Routing to onboarding flow.');
      return await runOnboardingFlow(userRef, userProfile, input);
    } 
    
    // --- Wellness Analysis Logic (if onboarding is already complete) ---
    console.log('[Chat Action] Routing to wellness analysis flow.');
    
    const now = new Date();
    const currentTime = format(now, "HH:mm");
    
    const enrichedInput = { ...input, currentTime };

    const wellnessResult = await runWellnessAnalysisFlow(userRef, userProfile, enrichedInput);
    
    // NEW: Trigger player update ("weetje") generation immediately after wellness scores are saved.
    if (wellnessResult.wellnessScores && userProfile.teamId) {
      // To generate a "weetje", we need the team's average scores.
      // We'll fetch them here. This might add a slight delay, but makes the feedback immediate.
      const summaryRef = adminDb.collection('clubs').doc(userProfile.clubId!).collection('teams').doc(userProfile.teamId).collection('summaries').orderBy('date', 'desc').limit(1);
      const summarySnap = await summaryRef.get();
      
      if (!summarySnap.empty) {
        const teamAverageScores = summarySnap.docs[0].data() as AITeamSummary;
        const playerUpdateInput: PlayerUpdateInput = {
          playerName: userProfile.name,
          playerScores: { ...wellnessResult.wellnessScores, id: '', date: '' }, // Construct a valid WellnessScore object
          teamAverageScores: teamAverageScores,
        };
        // Generate and save the update (fire-and-forget in the background)
        generatePlayerUpdate(playerUpdateInput).then(async (playerUpdateResult) => {
          if (playerUpdateResult) {
            const updateRef = userRef.collection('updates').doc();
            const updateData: PlayerUpdate = { ...playerUpdateResult, id: updateRef.id, date: format(new Date(), 'yyyy-MM-dd') };
            await updateRef.set(updateData);
            console.log(`[Chat Action] Real-time 'weetje' generated and saved for user ${userId}.`);
          }
        }).catch(err => {
          console.error(`[Chat Action] Failed to generate real-time 'weetje' for user ${userId}:`, err);
        });
      }
    }


    return wellnessResult;

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
