
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
    // This is a placeholder. A real implementation would use fetch() to call
    // a service like the Google Custom Search JSON API with an API key.
    return `Placeholder zoekresultaat voor "${input.query}". Om dit echt te laten werken, moet een zoek-API (zoals Google Custom Search) worden geïntegreerd.`;
  }
));

// This is the conversational response, separate from the background data analysis.
const ConversationalResponseSchema = z.object({
    response: z.string().describe("Het antwoord van de AI buddy op de gebruiker."),
});

// This is the correct, strongly-typed input schema for the prompt.
// This was the source of the bug. `z.any()` was too generic.
const WellnessPromptInputSchema = z.object({
  buddyName: z.string(),
  userName: z.string(),
  userMessage: z.string(),
  chatHistory: z.string().optional(),
  retrievedDocs: z.array(z.object({ name: z.string(), content: z.string() })).optional(),
  today: z.string(),
  dayName: z.string(),
  currentTime: z.string(),
  todayActivity: z.string(),
  isGameDay: z.boolean().optional(),
  gameJSON: z.string().optional(),
  missingTopics: z.array(z.string()).optional(),
  familySituation: z.string().optional(),
  schoolSituation: z.string().optional(),
  personalGoals: z.string().optional(),
  matchPreparation: z.string().optional(),
  recoveryHabits: z.string().optional(),
  additionalHobbies: z.string().optional(),
  personalDetails: z.string().optional(),
});


const wellnessBuddyPromptPromise = aiPromise.then(async ai => {
  const resolvedWebSearchTool = await webSearchToolPromise;
  return ai.definePrompt({
    name: 'wellnessBuddyPrompt_v43_individual_training',
    model: googleAI.model('gemini-2.5-flash'),
    tools: [resolvedWebSearchTool], 
    input: { schema: WellnessPromptInputSchema }, // Use the new, strong schema
    output: { schema: ConversationalResponseSchema },
    prompt: `
        Je bent een empathische AI-buddy genaamd {{{buddyName}}} voor een jonge atleet, {{{userName}}}.
        Je antwoord ('response') MOET in het Nederlands, beknopt en boeiend zijn. Je bent een vriend, geen interviewer.

        TAAK:
        1.  **Voer een SNELLE check-in.** Je doel is om binnen 5 minuten een update te krijgen over de belangrijkste welzijnsthema's.
        2.  **Begin het gesprek correct:**
            -   Als de 'Gespreksgeschiedenis' LEEG is, begin dan met een vraag gebaseerd op 'Activiteit vandaag ({{{todayActivity}}})'.
                -   Bij 'game': "Hey {{{userName}}}! Het is wedstrijddag, veel succes! Hoe voel je je?"
                -   Bij 'training': "Hey {{{userName}}}! Trainingsdag vandaag. Klaar voor? Hoe gaat het met je?"
                -   Bij 'individual': "Hey {{{userName}}}, hoe ging je individuele training vandaag?"
                -   Bij 'rest': "Hey {{{userName}}}, hoe gaat het vandaag met je?"
            -   Als er al een 'Gespreksgeschiedenis' is, ga dan direct verder met het gesprek zonder opnieuw te begroeten. Reageer op de laatste opmerking van de gebruiker.
        3.  **Vraag naar ontbrekende onderwerpen:** Probeer op een natuurlijke manier te informeren naar onderwerpen van deze lijst die nog niet besproken zijn: {{#if missingTopics}}[{{#each missingTopics}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}]{{else}}Alle onderwerpen zijn besproken.{{/if}}. Vraag niet naar alles tegelijk, maar pik er één uit als het past in het gesprek.
        4.  **Bied een dieper gesprek aan na de check-in.** Nadat je een paar onderwerpen hebt besproken, kun je afsluiten met een aanbod, zoals: "Oké, bedankt voor de update! Ik merkte dat je niet zo goed sliep, wil je daar nog even over praten?" Geef de speler de controle.
        5.  **Gebruik je tools:** Als de gebruiker vraagt naar actuele informatie (het weer, sportuitslagen, nieuws), gebruik dan de 'webSearch' tool. Vertel de gebruiker wat je hebt gevonden.
        6.  **Vraag NOOIT om scores.** Leid deze op de achtergrond af uit het gesprek (dit gebeurt in een andere stap).
        7.  **Einde Gesprek:** Als de gebruiker afscheid neemt (bv. "doei", "ciao"), zeg dan ook gedag en stel GEEN vraag meer.
        8.  **Umgang met Blessures:**
            - **DISCLAIMER:** Als een speler om medisch advies vraagt, zeg ALTIJD dat je geen dokter bent en geen specifiek medisch advies kunt geven.
            - **GEEF ALGEMENE TIPS:** Geef veilig, algemeen advies, zoals de RICE-methode (Rust, Ijs, Compressie, Elevatie).
            - **VERWIJS DOOR:** Eindig ALTIJD met de aanbeveling om een trainer, ouder of fysio te raadplegen.
            - VOORBEELD: "Ik snap dat je twijfelt over je enkel. Ik ben geen dokter, dus ik kan je niet zeggen of je moet trainen. Wat vaak wordt aangeraden is de RICE-methode. Maar het is echt het beste om dit met je trainer of een fysio te bespreken."

        CONTEXT:
        - Kennisbank: {{#if retrievedDocs}}{{#each retrievedDocs}} - {{name}}: {{{content}}}{{/each}}{{else}}Geen.{{/if}}
        - Lange Termijn Geheugen: Jij weet over {{{userName}}}: {{{familySituation}}}, {{{schoolSituation}}}, {{{personalGoals}}}, {{{matchPreparation}}}, {{{recoveryHabits}}}, {{{additionalHobbies}}}.
        - Vandaag: Tijd: {{{currentTime}}}, Dag: {{{dayName}}}, Datum: {{{today}}}, Activiteit: {{{todayActivity}}}.

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

    