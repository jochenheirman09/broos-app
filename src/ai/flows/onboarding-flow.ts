'use server';

import { z } from 'genkit';
import { GenkitError } from 'genkit';
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { saveOnboardingSummary } from '@/services/firestore-service';
import { OnboardingInputSchema, OnboardingOutputSchema, type OnboardingTopic, type OnboardingInput, type OnboardingOutput, OnboardingTopicEnum } from '@/ai/types';
import type { UserProfile, WellnessAnalysisInput } from '@/lib/types';
import type { DocumentReference } from 'firebase-admin/firestore';

// Define the prompt for the onboarding flow
let onboardingPrompt: any;
function defineOnboardingPrompt() {
  if (onboardingPrompt) return;

  onboardingPrompt = ai.definePrompt({
    name: 'onboardingBuddyPrompt',
    model: googleAI.model('gemini-2.5-flash'),
    input: { schema: OnboardingInputSchema },
    output: { schema: OnboardingOutputSchema },
    prompt: `
      Je bent een empathische AI-psycholoog voor een jonge atleet genaamd {{{userName}}}.
      Je doel is om een natuurlijke, ondersteunende conversatie te hebben om de gebruiker beter te leren kennen.
      Je antwoord ('response') MOET in het Nederlands zijn.

      Het huidige onderwerp is '{{{currentTopic}}}'.
      - Leid het gesprek op een natuurlijke manier rond dit onderwerp. Stel vervolgvragen als de reactie van de gebruiker kort is om meer details te krijgen.
      - BELANGRIJK: Wees niet te opdringerig. Als de gebruiker aangeeft niet verder te willen praten over een detail (bv. met "ik weet het niet" of "geen idee"), respecteer dat dan en probeer het onderwerp vanuit een andere, bredere hoek te benaderen, of rond het af.
      - Als je vindt dat het onderwerp voldoende is besproken (of als de gebruiker aangeeft niet verder te willen), stel dan 'isTopicComplete' in op true.
      - Als 'isTopicComplete' waar is, geef dan een beknopte samenvatting (2-3 zinnen) van de input van de gebruiker voor dit onderwerp in het 'summary' veld, en eindig je 'response' met een vraag zoals "Ben je er klaar voor om het over iets anders te hebben?"
      - Anders, stel 'isTopicComplete' in op false en houd het gesprek gaande.

      Bericht van de gebruiker: "{{{userMessage}}}"
      Gespreksgeschiedenis over dit onderwerp:
      {{{chatHistory}}}
    `,
  });
}


/**
 * Executes the onboarding logic for a user.
 * It identifies the current topic, runs the AI prompt, and saves the summary
 * if a topic is completed.
 */
export async function runOnboardingFlow(
  userRef: DocumentReference,
  userProfile: UserProfile,
  input: WellnessAnalysisInput // Accepts the generic input from the controller
): Promise<OnboardingOutput> {
  console.log('[Onboarding Flow] Starting...');
  defineOnboardingPrompt();
  
  const allTopics = OnboardingTopicEnum.options;
  const nextTopic = allTopics.find(topic => !(topic in userProfile));
  
  if (!nextTopic) {
    console.log('[Onboarding Flow] All topics are complete. Updating profile and finishing.');
    await userRef.update({ onboardingCompleted: true });
    // This case should ideally be handled by the controller, but as a fallback:
    throw new GenkitError({
      status: 'FAILED_PRECONDITION', 
      message: 'Onboarding was already complete. The main controller should have routed to the wellness flow.'
    });
  }

  const onboardingInput: OnboardingInput = {
    ...input,
    currentTopic: nextTopic,
  };
  
  const parsedInput = OnboardingInputSchema.safeParse(onboardingInput);
  if (!parsedInput.success) {
    console.error('[Onboarding Flow] Invalid input:', parsedInput.error);
    throw new GenkitError({ status: 'INVALID_ARGUMENT', message: 'Invalid input for onboarding prompt.' });
  }

  console.log(`[Onboarding Flow] Executing prompt for topic: ${nextTopic}`);
  const { output } = await onboardingPrompt(parsedInput.data);

  if (!output) {
    throw new Error("Onboarding AI prompt returned no output.");
  }

  // If the topic is complete, save the summary and potentially finalize onboarding.
  if (output.isTopicComplete && output.summary) {
    await saveOnboardingSummary(userRef, userProfile, nextTopic, output.summary);
  }
  
  return output;
}
