
'use server';

import { ai as genkitAI } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { TeamAnalysisInputSchema, TeamAnalysisOutputSchema, type TeamAnalysisInput, type TeamAnalysisOutput } from '@/ai/types';

// Lazily define the prompt to avoid initialization issues.
let teamAnalysisPrompt: any;
function defineTeamAnalysisPrompt() {
    if (teamAnalysisPrompt) return teamAnalysisPrompt;

    const ai = genkitAI({
        plugins: [googleAI()],
        logLevel: 'debug',
        enableTracingAndMetrics: true,
    });

    teamAnalysisPrompt = ai.definePrompt({
        name: 'teamDataAnalyzerPrompt',
        model: googleAI.model('gemini-2.5-flash'),
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
    return teamAnalysisPrompt;
}


/**
 * Server-side function to analyze team wellness data and generate insights.
 */
export async function analyzeTeamData(input: TeamAnalysisInput): Promise<TeamAnalysisOutput | null> {
    console.log(`[SERVER ACTION] analyzeTeamData invoked for team: ${input.teamName}`);
    const prompt = defineTeamAnalysisPrompt();

    try {
        const { output } = await prompt(input);
        if (!output) {
            console.warn('[SERVER ACTION] Team analysis prompt returned no output.');
            return null;
        }
        return output;
    } catch (error: any) {
        console.error(`[SERVER ACTION] CRITICAL ERROR IN TEAM ANALYSIS FLOW for team ${input.teamId}:`, error);
        return null;
    }
}
