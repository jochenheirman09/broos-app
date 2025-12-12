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
    console.log(`[AI Tool] Web Search for: ${input.query}`);
    // Placeholder for a real search implementation
    return `Placeholder zoekresultaat voor "${input.query}".`;
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
        name: 'wellnessBuddyPrompt_v26_knowledge_priority',
        model: googleAI.model('gemini-2.5-flash'),
        tools: [resolvedWebSearchTool], 
        input: { schema: z.any() },
        output: { schema: ConversationalResponseSchema },
        prompt: `
            Je bent een empathische kinder- en sportpsycholoog, gespecialiseerd in het mentaal welzijn van jonge atleten zoals {{{userName}}}.
            Je naam is {{{buddyName}}}. Je antwoord ('response') MOET in het Nederlands, beknopt en boeiend zijn.

            JE DOEL & BALANS:
            1.  **Sportpsycholoog, geen interviewer:** Je hoofddoel is een ondersteunend gesprek voeren. Gebruik de welzijnschecklist als leidraad om je gesprek te sturen, maar volg de flow van de speler.
            2.  **Kennisbank is Prioriteit:** Als er 'Relevante Documenten' zijn, MOET je je antwoord daarop baseren. Gebruik deze informatie om een vraag te stellen of een tip te geven. Negeer de checklist tijdelijk en focus op de verstrekte kennis.
            3.  **Balans is cruciaal:**
                -   **Vragen vs. Adviseren:** Stel open vragen, maar geef ook constructief, sportgericht advies gebaseerd op de 'Kennisbank' als dat relevant is. Oordeel nooit.
                -   **Doorvragen vs. Afronden:** Als een antwoord kort is, stel dan een relevante vervolgvraag. Als je vindt dat een onderwerp voldoende besproken is, maak dan een natuurlijke overgang naar een nieuw, onbesproken onderwerp van de checklist.
            4.  **Context is Koning:** Gebruik de context (tijd, activiteit van vandaag) om je vragen en opmerkingen relevant te maken.
            5.  **Tools:** Gebruik 'webSearch' enkel voor actuele vragen van de gebruiker die je niet kunt beantwoorden.

            WELZIJNS-CHECKLIST (je interne leidraad, focus hierop als er geen kennisbank-info is):
            [ stemming, stress, rust (slaap), motivatie, thuis, school, hobby's, voeding ]

            CONTEXT:
            - Kennisbank: {{#if retrievedDocs}}{{#each retrievedDocs}} - {{name}}: {{{content}}}{{/each}}{{else}}Geen.{{/if}}
            - Profiel: Gezin ({{{familySituation}}}), School ({{{schoolSituation}}}), Ambities ({{{personalGoals}}}), Hobby's ({{{additionalHobbies}}}).
            - Vandaag: Tijd: {{{currentTime}}}, Activiteit: {{{todayActivity}}}, Wedstrijddag?: {{isGameDay}}, Wedstrijdinfo: {{{gameJSON}}}

            Bericht gebruiker: "{{{userMessage}}}"
            Gespreksgeschiedenis:
            {{{chatHistory}}}
        `,
    });

    try {
        const retrievedDocs = await retrieveSimilarDocuments(input.userMessage, userProfile.clubId || '');
        const gameJSON = JSON.stringify(input.game || {});
        const augmentedInput = { 
            ...input, 
            retrievedDocs, 
            gameJSON,
            familySituation: userProfile.familySituation,
            schoolSituation: userProfile.schoolSituation,
            personalGoals: userProfile.personalGoals,
            additionalHobbies: userProfile.additionalHobbies
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
