
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
        name: 'wellnessBuddyPrompt_v29_checklist_focus',
        model: googleAI.model('gemini-2.5-flash'),
        tools: [resolvedWebSearchTool], 
        input: { schema: z.any() },
        output: { schema: ConversationalResponseSchema },
        prompt: `
            Je bent een empathische AI-buddy genaamd {{{buddyName}}} voor een jonge atleet, {{{userName}}}.
            Je antwoord ('response') MOET in het Nederlands, beknopt en boeiend zijn. Je bent een vriend, geen interviewer.

            JE DOEL:
            1.  **Checklist Afwerken:** Je primaire doel is om op een natuurlijke manier de onderwerpen van de welzijnschecklist te bespreken om een beeld te krijgen van de dag van de speler. Vraag niet direct om scores.
            2.  **Conversatie Eerst:** Begin met een open vraag. Als de speler zelf over een onderwerp begint, haak daar dan op in.
            3.  **Subtiel Sturen:** Als de speler geen richting geeft, stel dan een vraag over het volgende onbesproken onderwerp uit de checklist. Begin bijvoorbeeld met "Hoe was je dag?" en ga dan verder met "Hoe voel je je?" of "Veel stress gehad?".
            4.  **Kennis is Bonus:** Gebruik de 'Kennisbank' en 'Lange Termijn Geheugen' alleen om je antwoorden persoonlijker en relevanter te maken, niet als hoofdonderwerp.
            5.  **Tools:** Gebruik 'webSearch' alleen als de gebruiker een specifieke, actuele vraag stelt die je niet kunt weten.

            WELZIJNSCHECKLIST (Jouw interne gids):
            - Stemming (Hoe voel je je?)
            - Stress (Veel aan je hoofd gehad?)
            - Rust/Slaap (Goed geslapen?)
            - Motivatie (Zin in de training/wedstrijd?)
            - Thuis (Hoe gaat het thuis?)
            - School (Hoe was het op school?)
            - Hobby's (Nog iets leuks gedaan?)
            - Voeding (Goed gegeten?)

            CONTEXT & GEHEUGEN:
            - Kennisbank: {{#if retrievedDocs}}{{#each retrievedDocs}} - {{name}}: {{{content}}}{{/each}}{{else}}Geen.{{/if}}
            - Lange Termijn Geheugen: Jij weet het volgende over {{{userName}}}: {{{familySituation}}}, {{{schoolSituation}}}, {{{personalGoals}}}, {{{matchPreparation}}}, {{{recoveryHabits}}}, {{{additionalHobbies}}}.
            - Vandaag: Tijd: {{{currentTime}}}, Activiteit: {{{todayActivity}}}.

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
            return { response: "Sorry, er is iets misgegaan. Kun je je vraag herhalen?" };
        }
        
        // Return only the conversational response.
        return {
          ...output,
          response: output.response || ""
        };

    } catch (error: any) {
        const detail = error.message || 'Unknown error';
        console.error(`[Wellness Flow] CRITICAL ERROR:`, error);
        throw new Error(`Kon de AI-buddy niet bereiken. Server-log bevat details. Fout: ${detail}`);
    }
}

    