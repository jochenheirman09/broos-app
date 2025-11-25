'use server';

import { GenkitError } from 'genkit';
import { adminDb } from '@/ai/genkit';
import { runOnboardingFlow } from '@/ai/flows/onboarding-flow';
import { runWellnessAnalysisFlow } from '@/ai/flows/wellness-analysis-flow';
import type { UserProfile, WellnessAnalysisInput } from '@/lib/types';

/**
 * Main controller for handling chat interactions.
 * This server action acts as a router, determining whether to invoke the
 * onboarding flow or the regular wellness analysis flow based on the user's profile.
 *
 * @param userId The ID of the user initiating the chat.
 * @param input The basic chat input from the client.
 * @returns The output from either the onboarding or wellness analysis flow.
 */
export async function chatWithBuddy(
  userId: string,
  input: WellnessAnalysisInput
) {
  console.log('[Chat Action] chatWithBuddy invoked for user:', userId);

  // --- 1. GET USER PROFILE ---
  const userRef = adminDb.collection('users').doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new GenkitError({ status: 'NOT_FOUND', message: 'User profile not found.' });
  }
  const userProfile = userDoc.data() as UserProfile;

  // --- 2. ROUTE TO APPROPRIATE FLOW ---
  if (!userProfile.onboardingCompleted) {
    // User is in the onboarding process.
    console.log('[Chat Action] Routing to onboarding flow.');
    return runOnboardingFlow(userRef, userProfile, input);
  } else {
    // User has completed onboarding, use the regular chat flow.
    console.log('[Chat Action] Routing to wellness analysis flow.');
    return runWellnessAnalysisFlow(userRef, userProfile, input);
  }
}
