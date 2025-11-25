
'use server';

import { ai as genkitAI } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { PlayerUpdateInputSchema, PlayerUpdateOutputSchema, type PlayerUpdateInput, type PlayerUpdateOutput } from '@/ai/types';

// Lazily define the prompt to avoid initialization issues during build.
let playerUpdatePrompt: any;
function definePlayerUpdatePrompt() {
    if (playerUpdatePrompt) return playerUpdatePrompt;

    const ai = genkitAI({
        plugins: [googleAI()],
        logLevel: 'debug',
        enableTracingAndMetrics: true,
    });

    playerUpdatePrompt = ai.definePrompt({
        name: 'playerUpdateGeneratorPrompt',
        model: googleAI.model('gemini-2.5-flash'),
        input: { schema: PlayerUpdateInputSchema },
        output: { schema: PlayerUpdateOutputSchema },
        prompt: `
            Je bent een data-analist en een motiverende coach voor jonge voetballers.
            Je taak is om de data van een individuele speler te vergelijken met het teamgemiddelde en een interessant, positief en constructief 'weetje' te genereren.

            - Focus op één specifiek, opvallend verschil (positief of negatief).
            - Geef een pakkende 'title'.
            - Schrijf de 'content' in het Nederlands, direct gericht aan de speler (gebruik 'je' en 'jij').
            - Als de speler beter scoort, geef dan een compliment.
            - Als de speler lager scoort, geef dan een constructieve tip zonder te oordelen.
            - Koppel het weetje aan de prestaties op het veld.
            - Kies de meest relevante 'category'.

            Gegevens van de speler ({{{playerName}}}):
            - Stemming: {{{playerScores.mood}}}
            - Stress: {{{playerScores.stress}}}
            - Slaap: {{{playerScores.sleep}}}
            - Motivatie: {{{playerScores.motivation}}}

            Teamgemiddelden:
            - Gemiddelde Stemming: {{{teamAverageScores.averageMood}}}
            - Gemiddelde Stress: {{{teamAverageScores.averageStress}}}
            - Gemiddelde Slaap: {{{teamAverageScores.averageSleep}}}
            - Gemiddelde Motivatie: {{{teamAverageScores.averageMotivation}}}

            Voorbeeld Output:
            {
              "title": "Jij slaapt als een kampioen!",
              "content": "Wist je dat jij deze week gemiddeld 8.1 uur per nacht sliep, terwijl het teamgemiddelde 7.2 uur was? Die extra rust kan net het verschil maken in de laatste minuten van de wedstrijd. Goed bezig!",
              "category": "Sleep"
            }
        `,
    });
    return playerUpdatePrompt;
}

/**
 * Server-side function to generate a personalized "weetje" for a player.
 */
export async function generatePlayerUpdate(input: PlayerUpdateInput): Promise<PlayerUpdateOutput | null> {
    console.log('[SERVER ACTION] generatePlayerUpdate invoked for player:', input.playerName);
    const prompt = definePlayerUpdatePrompt();

    try {
        const { output } = await prompt(input);
        if (!output) {
            console.warn('[SERVER ACTION] Player update prompt returned no output.');
            return null;
        }
        return output;
    } catch (error: any) {
        console.error('[SERVER ACTION] CRITICAL ERROR IN PLAYER UPDATE FLOW:', error);
        // Do not re-throw, as this might break the entire cron job.
        // Just log the error and return null.
        return null;
    }
}
