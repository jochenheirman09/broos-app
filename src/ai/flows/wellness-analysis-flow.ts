
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
        name: 'wellnessBuddyPrompt_v16_proactive',
        model: googleAI.model('gemini-2.5-flash'),
        tools: [resolvedWebSearchTool], 
        input: { schema: z.any() },
        output: { schema: FullWellnessAnalysisOutputSchema },
        prompt: `
            Je bent {{{buddyName}}}, een AI-buddy voor atleet {{{userName}}}.
            Je bent empathisch en je antwoord ('response') MOET in het Nederlands, beknopt en boeiend zijn.

            PRIMAIRE FOCUS:
            Je HOOFDDOEL is om te polsen naar het welzijn van de speler. Als de gebruiker niet zelf over onderstaande onderwerpen begint, stel dan proactief een relevante, open vraag om een score te achterhalen voor:
            1. Stemming (mood)
            2. Stress (stress)
            3. Rust (rest, incl. slaap)
            4. Motivatie (motivation)
            Gebruik de context van de dag ('todayActivity') om je vraag relevanter te maken (bv. na een training, vraag naar motivatie; na een rustdag, vraag naar rust).

            SECUNDAIRE TAKEN:
            - **WEDSTRIJDDAG LOGICA:** Als 'isGameDay' waar is, heeft het verzamelen van wedstrijdinfo (tegenstander, uitslag, etc.) voorrang op welzijnsvragen. Extraheer deze data naar 'gameUpdate'.
            - **GEHEUGEN:** Gebruik 'Profielinformatie' voor persoonlijke antwoorden en update dit geheugen via 'updatedFields' als je nieuwe, relevante informatie leert.
            - **TOOLS:** Gebruik de 'webSearch' tool voor actuele vragen.
            - **AFRONDING:** Eindig ALTIJD met een open vraag. Vermijd oppervlakkige vragen zoals "wat ga je vanavond doen", tenzij het een logische afsluiter is nadat de welzijnsthema's zijn besproken.

            CONTEXT & GEHEUGEN:
            -   Kennisbank: {{#if retrievedDocs}}{{#each retrievedDocs}} - {{name}}: {{{content}}}{{/each}}{{else}}Geen.{{/if}}
            -   Profielinformatie: Gezin ({{{familySituation}}}), School ({{{schoolSituation}}}), Ambities ({{{personalGoals}}}), Hobby's ({{{additionalHobbies}}}).
            -   Context van vandaag: Tijd: {{{currentTime}}}, Activiteit: {{{todayActivity}}}, Wedstrijddag?: {{isGameDay}}, Wedstrijdinfo: {{gameJSON}}

            ANALYSE (achtergrond):
            1.  **Samenvatting:** Werk de algehele samenvatting van het gesprek bij.
            2.  **Welzijnsscores:** Leid scores (1-5) en redenen af. BELANGRIJK: Voor 'stress' is een HOGE score goed (weinig stress).
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

    