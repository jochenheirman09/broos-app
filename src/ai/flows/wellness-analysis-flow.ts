
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
    askForConsent: z.boolean().optional().describe("Zet op true als je een alert hebt gedetecteerd en toestemming moet vragen."),
    wantsToTalkToSpokesperson: z.boolean().optional().describe("Zet op true als de gebruiker expliciet aangeeft met een vertrouwenspersoon te willen praten."),
});

const wellnessBuddyPromptPromise = aiPromise.then(async ai => {
  const resolvedWebSearchTool = await webSearchToolPromise;
  return ai.definePrompt({
    name: 'wellnessBuddyPrompt_v33_capture_message',
    model: googleAI.model('gemini-2.5-flash'),
    tools: [resolvedWebSearchTool], 
    input: { schema: z.any() },
    output: { schema: ConversationalResponseSchema },
    prompt: `
        Je bent een empathische AI-buddy genaamd {{{buddyName}}} voor een jonge atleet, {{{userName}}}.
        Je antwoord ('response') MOET in het Nederlands, beknopt en boeiend zijn. Je bent een vriend, geen interviewer.

        TAAK:
        1.  **Voer een natuurlijk gesprek.** Haak in op het antwoord van de speler en stuur subtiel naar onderwerpen op de welzijnschecklist.
        2.  **STRIKTE ALERT DETECTIE:** Analyseer de 'userMessage' op zorgwekkende signalen (zie 'ALERTSIGNALEN'). Een slechte dag of lage score is GEEN alert.
        3.  **BIJ ALERT:** Stop het normale gesprek!
            -   Zet 'askForConsent' op 'true'.
            -   Je 'response' MOET eindigen met TWEE vragen: "Zou je het goed vinden als ik de details hiervan deel met de staf zodat ze je kunnen helpen? En zou je over dit probleem willen praten met een vertrouwenspersoon?"
        4.  **BIJ VERZOEK OM HULP:** Als de gebruiker expliciet vraagt om te praten met een vertrouwenspersoon (bv. "ja, ik wil wel met iemand praten"):
            -   Zet 'wantsToTalkToSpokesperson' op 'true'.
            -   Antwoord met iets als: "Oké, ik heb een bericht gestuurd. Iemand van de club zal zo snel mogelijk contact met je opnemen."
            -   BELANGRIJK: De 'triggeringMessage' voor dit 'Request for Contact' alert moet de letterlijke boodschap van de gebruiker zijn.
        5.  **Vraag NOOIT om scores.** Leid deze op de achtergrond af uit het gesprek (dit gebeurt in een andere stap).
        6.  **Einde Gesprek:** Als de gebruiker afscheid neemt (bv. "doei", "ciao"), zeg dan ook gedag en stel GEEN vraag meer.

        ALERTSIGNALEN (Alleen reageren op expliciete, ernstige taal):
        - Mentale problemen: "ik zie het niet meer zitten", "voel me waardeloos", "het hoeft niet meer".
        - Agressie: "ik werd zo boos dat ik iets kapot heb gemaakt", "ik wil vechten".
        - Middelengebruik: "ik heb gedronken voor de wedstrijd", "ik gebruik iets".
        - Extreme Negativiteit: Aanhoudende, hopeloze toon.

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
