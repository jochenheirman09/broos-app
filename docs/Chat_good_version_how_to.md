'use server';

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { getFirebaseAdmin } from '@/ai/genkit';
import { saveOnboardingSummary, saveWellnessData } from '@/services/firestore-service';
import { retrieveSimilarDocuments } from '@/ai/retriever';
import type { UserProfile, WellnessAnalysisInput, OnboardingInput } from '@/lib/types';
import {
  OnboardingOutputSchema,
  WellnessAnalysisOutputSchema,
  type OnboardingOutput,
  type WellnessAnalysisOutput,
  OnboardingInputSchema,
  WellnessAnalysisInputSchema
} from '@/ai/types';

// ================================================================================================
// This file is a backup of the complex chat logic before the step-by-step rebuild.
// This logic will be re-integrated in a future step.
// ================================================================================================

export async function chatWithBuddy(
  userId: string,
  input: WellnessAnalysisInput
): Promise<OnboardingOutput | WellnessAnalysisOutput> {
  
  const ai = genkit({
    plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
    logLevel: 'debug',
    enableTracingAndMetrics: true,
  });

  const { adminDb } = await getFirebaseAdmin();
  const userRef = adminDb.collection('users').doc(userId);
  const userDoc = await userRef.get();
  if (!userDoc.exists) {
    throw new Error('User profile not found.');
  }
  const userProfile = userDoc.data() as UserProfile;

  // --- Onboarding Logic ---
  if (!userProfile.onboardingCompleted) {
    const onboardingTopics: (keyof UserProfile)[] = [
      "familySituation", "schoolSituation", "personalGoals", 
      "matchPreparation", "recoveryHabits", "additionalHobbies"
    ];
    
    const nextTopic = onboardingTopics.find(topic => !userProfile[topic]) as keyof UserProfile | undefined;

    if (nextTopic) {
        const onboardingBuddyPrompt = ai.definePrompt({
            name: 'onboardingBuddyPrompt',
            model: 'gemini-1.5-flash',
            input: { schema: OnboardingInputSchema },
            output: { schema: OnboardingOutputSchema },
            prompt: `
                Je bent een empathische AI-psycholoog voor een jonge atleet.
                Je doel is om een natuurlijke, ondersteunende conversatie te hebben om de gebruiker beter te leren kennen.
                Je antwoord ('response') MOET in het Nederlands zijn.

                Het huidige onderwerp is '{{{currentTopic}}}'.
                - Leid het gesprek op een natuurlijke manier rond dit onderwerp. Stel vervolgvragen als de reactie van de gebruiker kort is.
                - Als je vindt dat het onderwerp voldoende is besproken, stel dan 'isTopicComplete' in op true.
                - Als 'isTopicComplete' waar is, geef dan een beknopte samenvatting (2-3 zinnen) van de input in het 'summary' veld, en eindig je 'response' met een vraag zoals "Klaar voor het volgende?"
                - Anders, stel 'isTopicComplete' in op false en houd het gesprek gaande.

                Bericht van de gebruiker: "{{{userMessage}}}"
                Gespreksgeschiedenis over dit onderwerp:
                {{{chatHistory}}}
            `,
        });
        
      const onboardingInput: OnboardingInput = { ...input, currentTopic: nextTopic as any };
      const { output } = await onboardingBuddyPrompt(onboardingInput);
      if (!output) throw new Error("Onboarding prompt returned no output.");

      if (output.isTopicComplete && output.summary) {
        await saveOnboardingSummary(userRef, userProfile, nextTopic as any, output.summary);
      }
      return output;
    }
  }

  // --- Wellness Analysis Logic ---
  const wellnessBuddyPrompt = ai.definePrompt({
    name: 'wellnessBuddyPrompt',
    model: 'gemini-1.5-flash',
    input: { schema: WellnessAnalysisInputSchema },
    output: { schema: WellnessAnalysisOutputSchema },
    prompt: `
        Je bent {{{buddyName}}}, een vriendelijke AI-buddy. Je antwoord ('response') MOET in het Nederlands zijn.
        Baseer je antwoord EERST op 'Relevante Documenten'.

        Relevante Documenten:
        ---
        {{#if retrievedDocs}}
            {{#each retrievedDocs}}- Document '{{name}}': {{{content}}}{{/each}}
        {{else}}
            Geen.
        {{/if}}
        ---

        ANALYSEER het gesprek.
        1. Samenvatting: Geef een beknopte, algehele samenvatting (1-2 zinnen) van het gesprek in het 'summary' veld.
        2. Welzijnsscores: Extraheer scores (1-5) en redenen. Vul ALLEEN de velden in waarover de gebruiker info geeft.
        3. Alerts: Analyseer 'userMessage'. Als je een duidelijk signaal detecteert, vul het 'alert' object.

        Naam gebruiker: {{{userName}}}
        Bericht gebruiker: "{{{userMessage}}}"
        Gespreksgeschiedenis (context):
        {{{chatHistory}}}
      `,
  });

  try {
    const retrievedDocs = await retrieveSimilarDocuments(input.userMessage, userProfile.clubId || '');
    const augmentedInput = { ...input, retrievedDocs };
    
    const { output } = await wellnessBuddyPrompt(augmentedInput);
    if (!output) throw new Error("Wellness prompt returned no output.");
    
    await saveWellnessData(userId, output);
    
    return output;
  } catch (error: any) {
    const detail = error.message || 'Unknown error';
    throw new Error(`Kon de AI-buddy niet bereiken. Server-log bevat details. Fout: ${detail}`);
  }
}
