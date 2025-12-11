
'use server';

import { getFirebaseAdmin } from '@/ai/genkit';
import { runOnboardingFlow } from '@/ai/flows/onboarding-flow';
import { runWellnessAnalysisFlow } from '@/ai/flows/wellness-analysis-flow';
import type { UserProfile, WellnessAnalysisInput, ScheduleActivity, Game, FullWellnessAnalysisOutput } from '@/lib/types';
import { GenkitError } from 'genkit';
import { getDay } from 'date-fns';
import { saveAssistantResponse, saveUserMessage } from '@/services/firestore-service';

/**
 * Main controller for handling chat interactions with the AI Buddy.
 * This server action acts as a router, determining whether to invoke the
 * onboarding flow or the regular wellness analysis flow based on the user's profile.
 * It enriches the input, calls the appropriate AI flow, and then saves all resulting data.
 *
 * @param userId The ID of the user initiating the chat.
 * @param input The basic chat input from the client.
 * @returns The output from either the onboarding or wellness analysis flow, or an error object.
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
  
  const dayMapping: { [key: number]: keyof UserProfile['schedule'] } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };
  
  try {
    const { adminDb } = await getFirebaseAdmin();
    const userRef = adminDb.collection('users').doc(userId);
    const now = new Date();
    // Use server-safe ISO string date formatting
    const today = now.toISOString().split('T')[0];

    // Immediately save user message to provide quick UI feedback.
    const isSystemStartMessage = input.userMessage === 'Start het gesprek voor vandaag.';
    if (!isSystemStartMessage) {
        console.log("[Chat Action] Saving user message first.");
        await saveUserMessage(userId, today, input.userMessage);
        console.log("[Chat Action] User message saved.");
    }
    
    console.log("[Chat Action] Fetching user profile and building context.");
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new GenkitError({ status: 'NOT_FOUND', message: 'User profile not found.' });
    }
    const userProfile = userDoc.data() as UserProfile;

    // Data Enrichment
    const dayName = dayMapping[getDay(now)];
    let todayActivity: ScheduleActivity | 'individual' = 'rest';
    let isGameDay = false;
    let game: Partial<Game> = {};
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;


    const individualTrainingQuery = userRef.collection('trainings').where('date', '==', today).limit(1);
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
    
    isGameDay = todayActivity === 'game';

    if (isGameDay) {
        const gameDocRef = userRef.collection('games').doc(today);
        const gameDoc = await gameDocRef.get();
        if (gameDoc.exists) {
            game = gameDoc.data() as Game;
        }
    }
    
    const messagesSnapshot = await userRef.collection('chats').doc(today).collection('messages').orderBy('sortOrder', 'asc').get();
    const chatHistory = messagesSnapshot.docs.map(doc => `${doc.data().role}: ${doc.data().content}`).join('\n');
    console.log("[Chat Action] History fetched for AI context.");

    const enrichedInput: WellnessAnalysisInput = { 
        ...input, 
        currentTime,
        chatHistory,
        todayActivity,
        isGameDay,
        game,
        familySituation: userProfile.familySituation || "",
        schoolSituation: userProfile.schoolSituation || "",
        personalGoals: userProfile.personalGoals || "",
        matchPreparation: userProfile.matchPreparation || "",
        recoveryHabits: userProfile.recoveryHabits || "",
        additionalHobbies: userProfile.additionalHobbies || "",
    };

    let result;
    if (!userProfile.onboardingCompleted) {
      console.log('[Chat Action] Routing to onboarding flow.');
      result = await runOnboardingFlow(userRef, userProfile, enrichedInput);
    } else {
      console.log('[Chat Action] Routing to wellness analysis flow.');
      result = await runWellnessAnalysisFlow(userRef, userProfile, enrichedInput);
    }
    
    // After getting the AI response, save all the data in one go.
    console.log("[Chat Action] Saving assistant response and extracted data.");
    const fullResult = result as FullWellnessAnalysisOutput; 
    const saveDataPayload = {
      userId: userId,
      assistantResponse: fullResult.response,
      summary: fullResult.summary,
      wellnessScores: fullResult.wellnessScores,
      alert: fullResult.alert,
      gameUpdate: fullResult.gameUpdate,
      askForConsent: fullResult.askForConsent,
    };
    
    await saveAssistantResponse(saveDataPayload); 
    console.log("[Chat Action] Assistant response and data saved.");

    // Return the result to the client for UI updates.
    return result;

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
