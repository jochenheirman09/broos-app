
'use server';
import { getAiInstance } from '../genkit';
import { PlayerUpdateInputSchema, PlayerUpdateOutputSchema, type PlayerUpdateInput, type PlayerUpdateOutput } from '../types';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Server-side function to generate a personalized "weetje" for a player.
 */
export async function generatePlayerUpdate(input: PlayerUpdateInput): Promise<PlayerUpdateOutput | null> {
    const ai = await getAiInstance();

    const playerUpdatePrompt = ai.definePrompt({
        name: 'playerUpdateGeneratorPrompt',
        model: googleAI.model('gemini-2.5-flash'),
        input: { schema: PlayerUpdateInputSchema },
        output: { schema: PlayerUpdateOutputSchema },
        prompt: `
            Je bent een data-analist en een motiverende coach voor jonge voetballers.
            Je taak is om de data van een individuele speler ({{{playerName}}}) te vergelijken met het teamgemiddelde en een interessant, positief en constructief 'weetje' te genereren.

            BELANGRIJKE REGELS:
            1.  Een hogere score (schaal 1-5) is ALTIJD beter.
                -   Voor Stemming, Slaap, Motivatie: een hoge score is positief.
                -   Voor Stress: een hoge score betekent WEINIG stress (dus positief). Een lage score (1-2) betekent VEEL stress.
            2.  **NUANCE IS CRUCIAAL:** Vergelijk niet alleen met het gemiddelde, maar kijk ook naar de absolute score.
                -   Een score van 4 of 5 is over het algemeen goed, zelfs als het iets onder het gemiddelde ligt. Wees in dat geval bemoedigend.
                -   Een score van 1 of 2 is een aandachtspunt. Wees ondersteunend en geef een tip.
                -   Een score van 3 is neutraal.

            TAKEN:
            1.  Focus op één specifiek, opvallend verschil (positief of negatief).
            2.  Geef een pakkende 'title'.
            3.  Schrijf de 'content' in het Nederlands, direct gericht aan de speler (gebruik 'je' en 'jij').
            4.  Koppel het weetje aan de prestaties op het veld.
            5.  Kies de meest relevante 'category'.

            Gegevens van de speler ({{{playerName}}}):
            - Stemming: {{{playerScores.mood}}}
            - Stress: {{{playerScores.stress}}}
            - Slaap (Rust): {{{playerScores.rest}}}
            - Motivatie: {{{playerScores.motivation}}}

            Teamgemiddelden:
            - Gemiddelde Stemming: {{{teamAverageScores.averageMood}}}
            - Gemiddelde Stress: {{{teamAverageScores.averageStress}}}
            - Gemiddelde Slaap (Rust): {{{teamAverageScores.averageSleep}}}
            - Gemiddelde Motivatie: {{{teamAverageScores.averageMotivation}}}

            Voorbeeld Output (als speler MEER stress had dan gemiddeld, maar de score nog steeds goed is, bv. 4 vs 4.5):
            {
              "title": "Je Blijft Kalm Onder Druk!",
              "content": "Hey {{{playerName}}}, je stressniveau was deze week een 4, terwijl het teamgemiddelde 4.5 was. Dat is een topscore! Je vermogen om kalm te blijven is een groot pluspunt, vooral in spannende wedstrijden. Ga zo door!",
              "category": "Stress"
            }
        `,
    });
    
    console.log('[SERVER ACTION] generatePlayerUpdate invoked for player:', input.playerName);

    try {
        const { output } = await playerUpdatePrompt(input);
        if (!output) {
            console.warn('[SERVER ACTION] Player update prompt returned no output.');
            return null;
        }
        return output;
    } catch (error: any) {
        console.error('[SERVER ACTION] CRITICAL ERROR IN PLAYER UPDATE FLOW:', error);
        return null;
    }
}
