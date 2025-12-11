
'use server';

import { z } from 'zod';
import type { DocumentReference } from 'firebase-admin/firestore';
import type { UserProfile, WellnessAnalysisInput, FullWellnessAnalysisOutput } from '@/lib/types';
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
    return `Placeholder zoekresultaat voor "${input.query}". In een echte app zou hier een actueel antwoord staan.`;
  }
));


export async function runWellnessAnalysisFlow(
    userRef: DocumentReference,
    userProfile: UserProfile,
    input: WellnessAnalysisInput
): Promise<FullWellnessAnalysisOutput> {
    
    const ai = await aiPromise;
    const resolvedWebSearchTool = await webSearchTool.parseAsync(ai);

    const WellnessScoresSchema = z.object({
        mood: z.number().min(1).max(5).optional().describe("Score van 1 (erg negatief) tot 5 (erg positief) voor de algemene stemming."),
        moodReason: z.string().optional().describe("Beknopte reden voor de stemming-score."),
        stress: z.number().min(1).max(5).optional().describe("BELANGRIJK: Score van 1 (veel stress) tot 5 (geen stress). Een hoge score is positief."),
        stressReason: z.string().optional().describe("Beknopte reden voor de stress-score."),
        rest: z.number().min(1).max(5).optional().describe("Score van 1 (slecht geslapen/uitgerust) tot 5 (goed geslapen/uitgerust) voor de algehele rust, inclusief slaapkwaliteit."),
        restReason: z.string().optional().describe("Beknopte reden voor de rust/slaap-score."),
        motivation: z.number().min(1).max(5).optional().describe("Score van 1 (niet gemotiveerd) tot 5 (zeer gemotiveerd) voor motivatie."),
        motivationReason: z.string().optional().describe("Beknopte reden voor de motivatie-score."),
    });
      
    const FullWellnessAnalysisOutputSchema = z.object({
        response: z.string().describe("Het antwoord van de AI buddy op de gebruiker."),
        summary: z.string().optional().describe("Een beknopte, algehele samenvatting van het gehele gesprek van vandaag."),
        wellnessScores: WellnessScoresSchema.optional(),
        alert: z.object({
            alertType: z.enum(['Mental Health', 'Aggression', 'Substance Abuse', 'Extreme Negativity']),
            triggeringMessage: z.string(),
            shareWithStaff: z.boolean().optional(),
        }).optional(),
        askForConsent: z.boolean().optional().describe("Zet op true als je een alert hebt gedetecteerd maar de gebruiker nog geen toestemming heeft gegeven om de details te delen."),
        updatedFields: z.object({
            familySituation: z.string().optional(),
            schoolSituation: z.string().optional(),
            personalGoals: z.string().optional(),
            matchPreparation: z.string().optional(),
            recoveryHabits: z.string().optional(),
            additionalHobbies: z.string().optional(),
            personalDetails: z.string().optional(),
        }).optional().describe("Een object met bijgewerkte samenvattingen voor de profielvelden. Update alleen de velden waarover de gebruiker NIEUWE, relevante informatie deelt. Combineer de nieuwe informatie met de bestaande context."),
        gameUpdate: z.object({
            opponent: z.string().optional(),
            score: z.string().optional(),
            playerSummary: z.string().optional(),
            playerRating: z.number().min(1).max(10).optional(),
        }).optional().describe("Een object met wedstrijd-updates. Vul de velden in op basis van de fase van het gesprek (voor/na de wedstrijd)."),
    });

    const wellnessBuddyPrompt = ai.definePrompt({
        name: 'wellnessBuddyPrompt_v19_completeness',
        model: googleAI.model('gemini-2.5-flash'),
        tools: [resolvedWebSearchTool], 
        input: { schema: z.any() },
        output: { schema: FullWellnessAnalysisOutputSchema },
        prompt: `
            Je bent {{{buddyName}}}, een AI-buddy voor atleet {{{userName}}}.
            Je bent empathisch en je antwoord ('response') MOET in het Nederlands, beknopt en boeiend zijn.

            PRIMAIRE FOCUS: NATUURLIJK GESPREK
            Je hoofddoel is om het welzijn van de speler te peilen.
            1.  **Analyseer de gespreksgeschiedenis.** Bepaal welke van de vier kernthema's (Stemming, Stress, Rust, Motivatie) vandaag nog NIET aan bod zijn gekomen.
            2.  **Stel een proactieve, open vraag** om een van de ontbrekende onderwerpen op een natuurlijke manier aan te snijden. Gebruik de 'Context van vandaag' om je vraag relevant te maken.
            3.  **LEID scores af, VRAAG er niet om.** Leid scores (1-5) op de achtergrond af uit het antwoord. Een kort antwoord is prima; dring niet aan.

            Voorbeeld: De activiteit is 'training' en 'motivatie' is nog niet besproken. Een goede vraag is: "Hoe voelde je je tijdens de training? Had je er een beetje zin in?"

            SECUNDAIRE TAKEN:
            - **WEDSTRIJDDAG LOGICA:** Als 'isGameDay' waar is, heeft het verzamelen van wedstrijdinfo (tegenstander, uitslag, etc.) voorrang. Extraheer naar 'gameUpdate'.
            - **GEHEUGEN:** Gebruik 'Profielinformatie' voor persoonlijke antwoorden en update dit via 'updatedFields' als je nieuwe, relevante info leert.
            - **TOOLS:** Gebruik de 'webSearch' tool voor actuele vragen.
            - **AFRONDING:** Eindig ALTIJD met een open vraag.

            CONTEXT & GEHEUGEN:
            -   Kennisbank: {{#if retrievedDocs}}{{#each retrievedDocs}} - {{name}}: {{{content}}}{{/each}}{{else}}Geen.{{/if}}
            -   Profielinformatie: Gezin ({{{familySituation}}}), School ({{{schoolSituation}}}), Ambities ({{{personalGoals}}}), Hobby's ({{{additionalHobbies}}}).
            -   Context van vandaag: Tijd: {{{currentTime}}}, Activiteit: {{{todayActivity}}}, Wedstrijddag?: {{isGameDay}}, Wedstrijdinfo: {{gameJSON}}

            ANALYSE (achtergrond):
            1.  **Samenvatting:** Werk de algehele samenvatting van het gesprek bij.
            2.  **Welzijnsscores:** LEID scores (1-5) en redenen AF. BELANGRIJK: Voor 'stress' is een HOGE score goed (weinig stress). 'Rest' omvat zowel rust als slaapkwaliteit.
            3.  **Alerts:** Als de 'userMessage' een zorgwekkend signaal bevat, zet 'askForConsent' op 'true'.

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
        };
        
        const { output } = await wellnessBuddyPrompt(augmentedInput);
        if (!output) {
            throw new Error("Wellness prompt returned no output.");
        }
        
        if (output.updatedFields && Object.keys(output.updatedFields).length > 0) {
            console.log(`[Wellness Flow] Updating user profile with new AI-extracted details:`, output.updatedFields);
            userRef.update(output.updatedFields).catch(err => {
                console.error(`[Wellness Flow] Failed to update profile details for user ${userRef.id}:`, err);
            });
        }
        
        return output;

    } catch (error: any) {
        const detail = error.message || 'Unknown error';
        console.error(`[Wellness Flow] CRITICAL ERROR:`, error);
        throw new Error(`Kon de AI-buddy niet bereiken. Server-log bevat details. Fout: ${detail}`);
    }
}

    