
'use server';

import { ai } from '@/ai/genkit';
import { ClubAnalysisInputSchema, ClubInsightSchema, type ClubAnalysisInput, type ClubInsight } from '@/ai/types';

/**
 * Server-side function to analyze club-wide team data and generate insights.
 */
export async function analyzeClubData(input: ClubAnalysisInput): Promise<ClubInsight | null> {
    // Insurance Policy: API Key check
    if (!process.env.GEMINI_API_KEY) {
        console.error("[AI Flow - Club Analysis] CRITICAL: GEMINI_API_KEY is not set.");
        // Return null to prevent a hard crash, the cron job will log this.
        return null;
    }

    const clubAnalysisPrompt = ai.definePrompt({
        name: 'clubDataAnalyzerPrompt',
        model: 'googleai/gemini-2.5-flash',
        input: { schema: ClubAnalysisInputSchema },
        output: { schema: ClubInsightSchema },
        prompt: `
            Je bent een hoofdanalist voor voetbalclub '{{{clubName}}}'. Je taak is om de samengevatte data van verschillende teams te vergelijken en één hoog-over inzicht te genereren voor de clubverantwoordelijke.

            DATA:
            {{#each teamSummaries}}
            - Team {{teamName}}: Gem. Stemming: {{summary.averageMood}}, Gem. Stress: {{summary.averageStress}}, Gem. Slaap: {{summary.averageSleep}}, Aantal Blessures: {{summary.injuryCount}}.
            {{/each}}

            TAKEN:
            1.  **Identificeer de meest significante trend of het grootste verschil tussen de teams.**
            2.  **Genereer één enkel, bruikbaar inzicht (insight) voor de clubverantwoordelijke.**
                -   **Title:** Een korte, duidelijke titel die het inzicht samenvat.
                -   **Content:** Leg het inzicht uit in 2-3 zinnen. Focus op het 'waarom' en geef een strategische suggestie op clubniveau.
                -   **Category:** Kies de meest relevante categorie: 'Club Trends', 'Team Comparison', of 'Resource Suggestion'.

            Voorbeeld Output:
            {
              "title": "Slaapkwaliteit U19 Baart Zorgen",
              "content": "Team U19 slaapt gemiddeld 1.5 uur minder per nacht dan de U15 en U17. Dit kan invloed hebben op herstel en schoolprestaties. Overweeg een clubbrede workshop over slaaphygiëne voor de oudere jeugd.",
              "category": "Team Comparison"
            }
        `,
    });

    console.log(`[SERVER ACTION] analyzeClubData invoked for club: ${input.clubName}`);
    
    // Do not run analysis if there's only one team, as there's nothing to compare.
    if (input.teamSummaries.length < 2) {
        console.log(`[SERVER ACTION] Skipping club analysis for ${input.clubName}: only one team with data.`);
        return null;
    }

    try {
        const { output } = await clubAnalysisPrompt(input);
        if (!output) {
            console.warn('[SERVER ACTION] Club analysis prompt returned no output.');
            return null;
        }
        return output;
    } catch (error: any) {
        console.error(`[SERVER ACTION] CRITICAL ERROR IN CLUB ANALYSIS FLOW for club ${input.clubId}:`, error);
        return null;
    }
}
