'use server';
import { z } from 'genkit';
import type { DocumentReference } from 'firebase-admin/firestore';
import type { UserProfile, WellnessAnalysisInput } from '@/lib/types';
import { retrieveSimilarDocuments } from '@/ai/retriever';
import { getAiInstance } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

// DEFINE PROMPT AND TOOLS AT MODULE LEVEL to prevent re-registration on every call.
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
    // Placeholder for a real search implementation
    return `Placeholder zoekresultaat voor "${input.query}".`;
  }
));

const ConversationalResponseSchema = z.object({
    response: z.string().describe("Het antwoord van de AI buddy op de gebruiker."),
});

const wellnessBuddyPromptPromise = aiPromise.then(async ai => {
  const resolvedWebSearchTool = await webSearchToolPromise;
  return ai.definePrompt({
    name: 'wellnessBuddyPrompt_v30_strict_alerts',
    model: googleAI.model('gemini-2.5-flash'),
    tools: [resolvedWebSearchTool], 
    input: { schema: z.any() },
    output: { schema: ConversationalResponseSchema },
    prompt: `
        Je bent een empathische AI-buddy genaamd {{{buddyName}}} voor een jonge atleet, {{{userName}}}.
        Je antwoord ('response') MOET in het Nederlands, beknopt en boeiend zijn. Je bent een vriend, geen interviewer.

        JE DOEL:
        1.  **Checklist EERST:** Je absolute hoofddoel is om de onderwerpen van de welzijnschecklist te bespreken. De speler heeft weinig tijd. Verlies GEEN tijd met details over hobby's of vakantieplannen. Wees efficiënt.
        2.  **Natuurlijke Gespreksflow:** Begin met een open vraag ("Hoe was je dag?"). Luister naar het antwoord en haak daarop in. Als de speler zelf al een onderwerp van de checklist noemt (bv. "ik ben moe"), vraag daar dan op door.
        3.  **Subtiel Sturen:** Als de speler algemeen antwoordt, stuur het gesprek dan subtiel naar het VOLGENDE onbesproken onderwerp op de checklist. Voorbeeld: "Oké, en hoe voel je je verder?" of "Goed geslapen?".
        4.  **Vraag NIET om scores:** Leid de scores af uit het gesprek.
        5.  **Tools & Geheugen:** Gebruik je geheugen en tools alleen om je antwoorden persoonlijker te maken, niet als hoofdonderwerp.

        WELZIJNSCHECKLIST (Jouw interne gids, werk deze af):
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
});


export async function runWellnessAnalysisFlow(
    userRef: DocumentReference,
    userProfile: UserProfile,
    input: WellnessAnalysisInput
): Promise<{ response: string }> {
    
    // Use the resolved prompt from the module-level promise.
    const wellnessBuddyPrompt = await wellnessBuddyPromptPromise;

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
          response: output.response || ""
        };

    } catch (error: any) {
        const detail = error.message || 'Unknown error';
        console.error(`[Wellness Flow] CRITICAL ERROR:`, error);
        throw new Error(`Kon de AI-buddy niet bereiken. Server-log bevat details. Fout: ${detail}`);
    }
}
