'use server';

import { z } from 'genkit';
import { GenkitError, ai as genkitAI } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { retrieveSimilarDocuments } from '@/ai/retriever';
import { saveWellnessData } from '@/services/firestore-service';
import type { UserProfile, WellnessAnalysisInput } from '@/lib/types';
import type { DocumentReference } from 'firebase-admin/firestore';
import { WellnessAnalysisInputSchema, WellnessAnalysisOutputSchema, type WellnessAnalysisOutput } from '@/ai/types';


// Define the prompt for the regular chat flow
let regularBuddyPrompt: any;
function defineRegularBuddyPrompt() {
  if (regularBuddyPrompt) return regularBuddyPrompt;
  
  const ai = genkitAI({
    plugins: [googleAI()],
    logLevel: 'debug',
    enableTracingAndMetrics: true,
  });

  regularBuddyPrompt = ai.definePrompt({
    name: 'wellnessBuddyPrompt',
    model: googleAI.model('gemini-2.5-flash'),
    input: { schema: WellnessAnalysisInputSchema },
    output: { schema: WellnessAnalysisOutputSchema },
    prompt: `
        Je bent {{{buddyName}}}, een vriendelijke en behulpzame AI-buddy.
        Je antwoord ('response') MOET in het Nederlands zijn. Hou je antwoorden beknopt en boeiend.

        BELANGRIJK: Baseer je antwoord EERST op de informatie uit 'Relevante Documenten' als deze relevant is voor de vraag van de gebruiker. Gebruik anders je algemene kennis.

        Relevante Documenten (uit de kennisbank):
        ---
        {{#if retrievedDocs}}
            {{#each retrievedDocs}}
            - Document '{{name}}': {{{content}}}
            {{/each}}
        {{else}}
            Geen relevante documenten gevonden.
        {{/if}}
        ---

        ANALYSEER het gesprek op de achtergrond.
        1.  **Samenvatting:** Geef een beknopte, algemene samenvatting (1-2 zinnen) van het gehele gesprek van vandaag in het 'summary' veld.
        2.  **Welzijnsscores:** Extraheer scores (1-5) en redenen voor welzijnsaspecten. Vul ALLEEN de velden in 'wellnessScores' waarover de gebruiker expliciete informatie geeft.
        3.  **Alerts:** Analyseer de 'userMessage' op zorgwekkende signalen. Als je een duidelijk signaal detecteert, vul dan het 'alert' object met de 'alertType' en 'triggeringMessage'.

        Naam gebruiker: {{{userName}}}
        Bericht gebruiker: "{{{userMessage}}}"
        Gespreksgeschiedenis (voor context, hoeft niet herhaald te worden):
        {{{chatHistory}}}
      `,
  });
  return regularBuddyPrompt;
}

/**
 * Executes the regular chat logic for a user who has completed onboarding.
 * It includes RAG retrieval and saves all generated wellness data to Firestore.
 */
export async function runWellnessAnalysisFlow(
  userRef: DocumentReference,
  userProfile: UserProfile,
  input: WellnessAnalysisInput
): Promise<WellnessAnalysisOutput> {
  console.log('[Wellness Flow] Starting...');
  const prompt = defineRegularBuddyPrompt();

  try {
    // RAG: Retrieve relevant documents.
    const retrievedDocs = await retrieveSimilarDocuments(input.userMessage, userProfile.clubId || '');
    
    const augmentedInput: WellnessAnalysisInput = {
      ...input,
      retrievedDocs,
    };

    const parsedInput = WellnessAnalysisInputSchema.safeParse(augmentedInput);
    if (!parsedInput.success) {
      console.error('[Wellness Flow] Invalid input:', parsedInput.error);
      throw new GenkitError({ status: 'INVALID_ARGUMENT', message: 'Invalid input for wellness prompt.' });
    }

    console.log('[Wellness Flow] Executing prompt...');
    const { output } = await prompt(parsedInput.data);

    if (!output) {
      throw new Error("Wellness AI prompt returned no output.");
    }
    
    // Asynchronously save all generated data using the dedicated service.
    await saveWellnessData(userRef.id, output);
    
    console.log('[Wellness Flow] Prompt successful. Returning output to client.');
    return output;

  } catch (error: any) {
    console.error('[Wellness Flow] CRITICAL ERROR:', error);
    throw error;
  }
}
