
'use server';
import { getAiInstance } from '../genkit';
import { z } from 'zod';
import type { TeamAnalysisInput, TeamAnalysisOutput } from '../types';
import { TeamAnalysisInputSchema, TeamAnalysisOutputSchema } from '../types';
import { googleAI } from '@genkit-ai/google-genai';


/**
 * Server-side function to analyze team wellness data and generate insights.
 */
export async function analyzeTeamData(input: TeamAnalysisInput): Promise<TeamAnalysisOutput | null> {
    console.log(`[AI Flow - Team Analysis] Invoked for team: ${input.teamName}`);
    
    const ai = await getAiInstance();

    const teamAnalysisPrompt = ai.definePrompt({
        name: 'teamDataAnalyzerPrompt',
        model: googleAI.model('gemini-2.5-flash'),
        input: { schema: TeamAnalysisInputSchema },
        output: { schema: TeamAnalysisOutputSchema },
        prompt: `
            Je bent een sportdata-analist voor een voetbalclub. Je taak is om de anonieme welzijnsdata van team '{{{teamName}}}' te analyseren.
            
            REGEL: Een hogere score (schaal 1-5) is ALTIJD beter. **Voor Stress betekent een hoge score (5/5) dus WEINIG stress.**

            DATA:
            {{#each playersData}}
            - Speler {{name}}: Stemming: {{scores.mood}}, Stress: {{scores.stress}}, Slaap: {{scores.rest}}, Motivatie: {{scores.motivation}}, Blessure: {{#if scores.injury}}Ja ({{scores.injuryReason}}){{else}}Nee{{/if}}. Redenen: {{scores.moodReason}}, {{scores.stressReason}}, {{scores.restReason}}, {{scores.motivationReason}}.
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
