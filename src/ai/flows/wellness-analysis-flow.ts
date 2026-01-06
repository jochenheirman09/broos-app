'use server';
import { z } from 'genkit';
import type { DocumentReference } from 'firebase-admin/firestore';
import type { UserProfile, WellnessAnalysisInput } from '@/lib/types';
import { retrieveSimilarDocuments } from '@/ai/retriever';
import { getAiInstance } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

const aiPromise = getAiInstance();

const webSearchToolPromise = aiPromise.then(ai => ai.defineTool(
  {
    name: 'webSearch',
    description: 'Zoek op het internet naar actuele informatie, zoals sportuitslagen, het weer, of nieuws.',
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.string(),
  },
  async (input) => {
    console.log(`[AI Tool] Web Search for: ${input.query}`);
    return `Placeholder zoekresultaat voor "${input.query}".`;
  }
));

const ConversationalResponseSchema = z.object({
    response: z.string().describe("Het antwoord van de AI buddy op de gebruiker."),
});

const wellnessBuddyPromptPromise = aiPromise.then(async ai => {
  const resolvedWebSearchTool = await webSearchToolPromise;
  return ai.definePrompt({
    name: 'wellnessBuddyPrompt_v34_conversational',
    model: googleAI.model('gemini-2.5-flash'),
    tools: [resolvedWebSearchTool], 
    input: { schema: z.any() },
    output: { schema: ConversationalResponseSchema },
    prompt: `
        Je bent een empathische AI-buddy genaamd {{{buddyName}}} voor een jonge atleet, {{{userName}}}.
        Je antwoord ('response') MOET in het Nederlands, beknopt en boeiend zijn. Je bent een vriend, geen interviewer.

        TAAK:
        1.  **Voer een natuurlijk gesprek.** Haak in op het antwoord van de speler en stuur subtiel naar onderwerpen op de welzijnschecklist.
        2.  **Vraag NOOIT om scores.** Leid deze op de achtergrond af uit het gesprek (dit gebeurt in een andere stap).
        3.  **Einde Gesprek:** Als de gebruiker afscheid neemt (bv. "doei", "ciao"), zeg dan ook gedag en stel GEEN vraag meer.

        CONTEXT:
        - Kennisbank: {{#if retrievedDocs}}{{#each retrievedDocs}} - {{name}}: {{{content}}}{{/each}}{{else}}Geen.{{/if}}
        - Lange Termijn Geheugen: Jij weet over {{{userName}}}: {{{familySituation}}}, {{{schoolSituation}}}, {{{personalGoals}}}, {{{matchPreparation}}}, {{{recoveryHabits}}}, {{{additionalHobbies}}}.
        - Vandaag: Tijd: {{{currentTime}}}, Activiteit: {{{todayActivity}}}.

        Bericht gebruiker: "{{{userMessage}}}"
        Gespreksgeschiedenis van vandaag:
        {{{chatHistory}}}
    `,
  });
});


export async function runWellnessAnalysisFlow(
    userRef: DocumentReference,
    userProfile: UserProfile,
    input: WellnessAnalysisInput
): Promise<{ response: string }> {
    
    const wellnessBuddyPrompt = await wellnessBuddyPromptPromise;

    try {
        const retrievedDocs = await retrieveSimilarDocuments(input.userMessage, userProfile.clubId || '');
        const gameJSON = JSON.stringify(input.game || {});
        
        const augmentedInput = { 
            ...input, 
            retrievedDocs, 
            gameJSON,
            buddyName: userProfile.buddyName || "Broos",
            userName: userProfile.name || "speler",
            familySituation: userProfile.familySituation || "Nog niet besproken.",
            schoolSituation: userProfile.schoolSituation || "Nog niet besproken.",
            personalGoals: userProfile.personalGoals || "Nog niet besproken.",
            matchPreparation: userProfile.matchPreparation || "Nog niet besproken.",
            recoveryHabits: userProfile.recoveryHabits || "Nog niet besproken.",
            additionalHobbies: userProfile.additionalHobbies || "Nog niet besproken.",
            personalDetails: userProfile.personalDetails || "Nog niet besproken.",
        };
        
        const { output } = await wellnessBuddyPrompt(augmentedInput);
        if (!output || !output.response) {
            return { response: "Sorry, er is iets misgegaan. Kun je je vraag herhalen?" };
        }
        
        return {
          response: output.response || ""
        };

    } catch (error: any) {
        const detail = error.message || 'Unknown error';
        console.error(`[Wellness Flow] CRITICAL ERROR:`, error);
        throw new Error(`Kon de AI-buddy niet bereiken. Server-log bevat details. Fout: ${detail}`);
    }
}
