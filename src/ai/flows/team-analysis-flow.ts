
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { TeamAnalysisInput, TeamAnalysisOutput } from '@/ai/types';
import { TeamAnalysisInputSchema, TeamAnalysisOutputSchema } from '@/ai/types';


/**
 * Server-side function to analyze team wellness data and generate insights.
 */
export async function analyzeTeamData(input: TeamAnalysisInput): Promise<TeamAnalysisOutput | null> {
    // Insurance Policy: API Key check
    if (!process.env.GEMINI_API_KEY) {
        console.error("[AI Flow - Team Analysis] CRITICAL: GEMINI_API_KEY is not set.");
        return null;
    }

    console.log(`[AI Flow - Team Analysis] Invoked for team: ${input.teamName}`);

    const teamAnalysisPrompt = ai.definePrompt({
        name: 'teamDataAnalyzerPrompt',
        model: 'gemini-2.5-flash',
        input: { schema: TeamAnalysisInputSchema },
        output: { schema: TeamAnalysisOutputSchema },
        prompt: `
            Je bent een sportdata-analist voor een voetbalclub. Je taak is om de anonieme welzijnsdata van team '{{{teamName}}}' te analyseren.

            DATA:
            {{#each playersData}}
            - Speler {{name}}: Stemming: {{scores.mood}}, Stress: {{scores.stress}}, Slaap: {{scores.sleep}}, Motivatie: {{scores.motivation}}, Blessure: {{#if scores.injury}}Ja ({{scores.injuryReason}}){{else}}Nee{{/if}}. Redenen: {{scores.moodReason}}, {{scores.stressReason}}, {{scores.sleepReason}}, {{scores.motivationReason}}.
            {{/each}}

            TAKEN:
            1.  **Teamoverzicht (summary):** Bereken de gemiddelde scores (afronden op 1 decimaal), tel het totaal aantal blessures, en identificeer 1-2 veelvoorkomende onderwerpen uit de redenen.
            2.  **Team-inzicht (insight):** Creëer één enkel, bruikbaar inzicht voor de staf. Baseer dit op de meest opvallende trend of correlatie in de data.
                -   **Title:** Een korte, duidelijke titel voor het inzicht.
                -   **Content:** Leg het inzicht uit in 2-3 zinnen. Geef een concreet, positief en praktisch advies.
                -   **Category:** Kies de meest relevante categorie: 'Team Performance', 'Player Wellness', of 'Injury Risk'.
        `,
    });


    try {
        const { output } = await teamAnalysisPrompt(input);
        if (!output) {
            console.warn('[AI Flow - Team Analysis] Prompt returned no output.');
            return null;
        }
        return output;
    } catch (error: any) {
        console.error(`[AI Flow - Team Analysis] CRITICAL ERROR for team ${input.teamId}:`, error);
        return null;
    }
}
