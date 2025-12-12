'use server';

import { z } from 'zod';
import type { DocumentReference } from 'firebase-admin/firestore';
import type { UserProfile, WellnessAnalysisInput } from '@/lib/types';
import { retrieveSimilarDocuments } from '@/ai/retriever';
import { getAiInstance } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

const aiPromise = getAiInstance();

const webSearchTool = z.any().transform(async (ai) => ai.defineTool(
  {
    name: 'webSearch',
    description: 'Zoek op het internet naar actuele informatie, zoals sportuitslagen, het weer, of nieuws.',
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.string(),
  },
  async (input) => {
    console.log(`[AI Tool] Web Search for: ${'input.query'}`);
    // Placeholder for a real search implementation
    return `Placeholder zoekresultaat voor "${'input.query'}".`;
  }
));

// Simplified output for stability. The AI's only job is to have a conversation.
const ConversationalResponseSchema = z.object({
    response: z.string().describe("Het antwoord van de AI buddy op de gebruiker."),
});

export async function runWellnessAnalysisFlow(
    userRef: DocumentReference,
    userProfile: UserProfile,
    input: WellnessAnalysisInput
): Promise<{ response: string }> {
    
    const ai = await aiPromise;
    const resolvedWebSearchTool = await webSearchTool.parseAsync(ai);

    const wellnessBuddyPrompt = ai.definePrompt({
        name: 'wellnessBuddyPrompt_v28_full_memory',
        model: googleAI.model('gemini-2.5-flash'),
        tools: [resolvedWebSearchTool], 
        input: { schema: z.any() },
        output: { schema: ConversationalResponseSchema },
        prompt: `
            Je bent een empathische kinder- en sportpsycholoog, gespecialiseerd in het mentaal welzijn van jonge atleten zoals {{{userName}}}.
            Je naam is {{{buddyName}}}. Je antwoord ('response') MOET in het Nederlands, beknopt en boeiend zijn. Je bent een vriend, geen interviewer.

            JE DOEL & PERSOONLIJKHEID:
            1.  **GEBRUIK JE GEHEUGEN:** Je primaire taak is om te antwoorden als iemand die de speler kent. Baseer je antwoord ALTIJD EERST op de 'LANGE TERMIJN GEHEUGEN' (profielinformatie) als de vraag van de speler daarmee te maken heeft. Je bent geen standaard AI; je hebt een gedeelde geschiedenis.
            2.  **Kennisbank is Secundair:** Alleen als de profielinformatie niet relevant is, baseer je je antwoord op de 'Kennisbank'.
            3.  **Welzijnschecklist is Laatste Redmiddel:** Alleen als er geen relevante profiel- of kennisbankinformatie is, stuur je het gesprek subtiel naar een onbesproken onderwerp van de checklist.
            4.  **Context is Koning:** Gebruik de context (tijd, activiteit van vandaag) om je vragen en opmerkingen relevant te maken.
            5.  **Tools:** Gebruik 'webSearch' enkel voor actuele vragen (bv. "wat was de uitslag van de wedstrijd?") die je niet kunt beantwoorden.

            LANGE TERMIJN GEHEUGEN (Jouw kennis over {{{userName}}}):
            - Gezinssituatie: {{{familySituation}}}
            - School/Vrienden: {{{schoolSituation}}}
            - Persoonlijke Doelen: {{{personalGoals}}}
            - Wedstrijdvoorbereiding: {{{matchPreparation}}}
            - Herstelgewoonten: {{{recoveryHabits}}}
            - Andere Hobby's: {{{additionalHobbies}}}
            - Algemene Weetjes: {{{personalDetails}}}

            CONTEXT:
            - Kennisbank: {{#if retrievedDocs}}{{#each retrievedDocs}} - {{name}}: {{{content}}}{{/each}}{{else}}Geen.{{/if}}
            - Vandaag: Tijd: {{{currentTime}}}, Activiteit: {{{todayActivity}}}, Wedstrijddag?: {{isGameDay}}, Wedstrijdinfo: {{{gameJSON}}}

            Bericht gebruiker: "{{{userMessage}}}"
            Gespreksgeschiedenis van vandaag:
            {{{chatHistory}}}
        `,
    });

    try {
        const retrievedDocs = await retrieveSimilarDocuments(input.userMessage, userProfile.clubId || '');
        const gameJSON = JSON.stringify(input.game || {});
        // Verrijk de input met alle relevante geheugeninformatie uit het gebruikersprofiel.
        const augmentedInput = { 
            ...input, 
            retrievedDocs, 
            gameJSON,
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
            throw new Error("Het AI-model gaf een leeg antwoord.");
        }
        
        // Return only the conversational response.
        return output;

    } catch (error: any) {
        const detail = error.message || 'Unknown error';
        console.error(`[Wellness Flow] CRITICAL ERROR:`, error);
        throw new Error(`Kon de AI-buddy niet bereiken. Server-log bevat details. Fout: ${detail}`);
    }
}
