
'use server';

import { getFirebaseAdmin } from '@/ai/genkit';
import { runOnboardingFlow } from '@/ai/flows/onboarding-flow';
import { runWellnessAnalysisFlow } from '@/ai/flows/wellness-analysis-flow';
import type { UserProfile, WellnessAnalysisInput, ScheduleActivity, Game } from '@/lib/types';
import { GenkitError } from 'genkit';
import { getDay } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { saveUserMessage, saveAssistantResponse, analyzeAndSaveChatData } from '@/services/firestore-service';

/**
 * Main controller for handling chat interactions with the AI Buddy.
 * This server action now has a more streamlined responsibility:
 * 1. Save the user's message immediately.
 * 2. Get a conversational response from the appropriate AI flow (onboarding or wellness).
 * 3. Save the assistant's response.
 * 4. Trigger a background job to analyze the entire day's chat for data extraction (fire-and-forget).
 *
 * @param userId The ID of the user initiating the chat.
 * @param input The basic chat input from the client.
 * @returns The direct conversational response from the AI or an error object.
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
    0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday',
  };
  
  try {
    const { adminDb } = await getFirebaseAdmin();
    const userRef = adminDb.collection('users').doc(userId);
    
    const timeZone = 'Europe/Brussels';
    const now = new Date();
    const today = formatInTimeZone(now, timeZone, 'yyyy-MM-dd');
    const currentTime = formatInTimeZone(now, timeZone, 'HH:mm');

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
        if (gameDoc.exists) game = gameDoc.data() as Game;
    }
    
    const messagesSnapshot = await userRef.collection('chats').doc(today).collection('messages').orderBy('sortOrder', 'asc').get();
    const chatHistory = messagesSnapshot.docs.map(doc => `${doc.data().role}: ${doc.data().content}`).join('\n');
    const isFirstInteraction = messagesSnapshot.docs.length <= 1; // 0 or 1 (system message)
    console.log(`[Chat Action] History fetched. Is first interaction: ${isFirstInteraction}`);

    const enrichedInput: WellnessAnalysisInput = { ...input, currentTime, chatHistory, todayActivity, isGameDay, game };

    let result;
    if (!userProfile.onboardingCompleted) {
      console.log('[Chat Action] Routing to onboarding flow.');
      // Pass isFirstInteraction to the onboarding flow so it can handle the welcome message.
      result = await runOnboardingFlow(userRef, userProfile, enrichedInput, isFirstInteraction);
    } else {
      console.log('[Chat Action] Routing to wellness analysis flow.');
      result = await runWellnessAnalysisFlow(userRef, userProfile, enrichedInput);
    }
    
    console.log("[Chat Action] Saving assistant response.");
    await saveAssistantResponse(userId, today, result.response);
    console.log("[Chat Action] Assistant response saved.");
    
    // Fire-and-forget the full analysis. The full chat history now includes the latest user and assistant messages.
    const finalChatHistory = chatHistory + `\nuser: ${input.userMessage}\nassistant: ${result.response}`;
    analyzeAndSaveChatData(userId, finalChatHistory).catch(err => {
        console.error(`[Chat Action] Background analysis failed for user ${userId}:`, err);
    });

    // Only return the direct response to the client for a fast UI update.
    return { response: result.response };

  } catch (error: any) {
    console.error("[Chat Action] Error in chatWithBuddy:", error.message);
    if (error.message && (error.message.includes('503') || error.message.toLowerCase().includes('overloaded') || error.message.includes('INVALID_ARGUMENT'))) {
      return {
        error: 'service_unavailable',
        response: "Mijn excuses, ik heb het even te druk. Probeer het over een momentje opnieuw.",
      };
    }
    // Re-throw other errors so the client-side catch block can handle them.
    throw error;
  }
}
