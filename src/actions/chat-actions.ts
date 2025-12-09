
'use server';

import { getFirebaseAdmin } from '@/ai/genkit';
import { runOnboardingFlow } from '@/ai/flows/onboarding-flow';
import { runWellnessAnalysisFlow } from '@/ai/flows/wellness-analysis-flow';
import type { UserProfile, WellnessAnalysisInput, ScheduleActivity, Game, FullWellnessAnalysisOutput } from '@/lib/types';
import { GenkitError } from 'genkit';
import { format, getDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { saveAssistantResponse } from '@/services/firestore-service';
import { FieldValue } from 'firebase-admin/firestore';


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
  
  try {
    const { adminDb } = await getFirebaseAdmin();
    const userRef = adminDb.collection('users').doc(userId);
    const now = new Date();
    const today = formatInTimeZone(now, "Europe/Brussels", "yyyy-MM-dd");

    // --- FIX: Step 1 - Immediately save the user's message if it's not the system start message ---
    const isSystemStartMessage = input.userMessage === 'Start het gesprek voor vandaag.';
    if (!isSystemStartMessage) {
        console.log("[Chat Action] Step 1: Saving user message first.");
        const messagesColRef = userRef.collection('chats').doc(today).collection('messages');
        await messagesColRef.add({
            role: 'user',
            content: input.userMessage,
            timestamp: FieldValue.serverTimestamp(),
            sortOrder: Date.now(),
        });
        console.log("[Chat Action] Step 1 Complete: User message saved.");
    }

    // --- Step 2: Fetch user profile and build the full, up-to-date context ---
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
    
    // Step 3: Fetch the now-complete chat history
    console.log("[Chat Action] Step 3: Fetching complete chat history.");
    const messagesSnapshot = await userRef.collection('chats').doc(today).collection('messages').orderBy('sortOrder', 'asc').get();
    const chatHistory = messagesSnapshot.docs.map(doc => `${doc.data().role}: ${doc.data().content}`).join('\n');
    console.log("[Chat Action] Step 3 Complete: History fetched.");

    const enrichedInput: WellnessAnalysisInput = { 
        ...input, 
        currentTime: formatInTimeZone(now, "Europe/Brussels", "HH:mm"), 
        chatHistory, // This now includes the message we just saved
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

    // --- Step 4: Routing & AI Execution ---
    let result;
    if (!userProfile.onboardingCompleted) {
      console.log('[Chat Action] Step 4: Routing to onboarding flow.');
      result = await runOnboardingFlow(userRef, userProfile, enrichedInput);
    } else {
      console.log('[Chat Action] Step 4: Routing to wellness analysis flow.');
      result = await runWellnessAnalysisFlow(userRef, userProfile, enrichedInput);
    }
    
    // --- Step 5: Save the AI's response and all other extracted data ---
    console.log("[Chat Action] Step 5: Saving assistant response and other data.");
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
    console.log("[Chat Action] Step 5 Complete: Assistant response saved.");

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
