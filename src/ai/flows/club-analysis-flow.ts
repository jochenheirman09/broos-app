
'use server';
/**
 * @fileOverview A Genkit flow for analyzing aggregated team data at the club level
 * to generate high-level insights for the club responsible.
 *
 * - analyzeClubData - A function that handles the club-level data analysis.
 * - ClubAnalysisInput - The input type for the analyzeClubData function.
 * - ClubAnalysisOutput - The return type for the analyzeClubData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { TeamSummarySchema } from '@/ai/flows/team-analysis-flow';
import type { ClubUpdate } from '@/lib/types';


// Define the input for the club analysis flow
export const ClubAnalysisInputSchema = z.object({
  clubId: z.string(),
  clubName: z.string(),
  teamSummaries: z.array(z.object({
      teamName: z.string(),
      summary: TeamSummarySchema,
  })),
});
export type ClubAnalysisInput = z.infer<typeof ClubAnalysisInputSchema>;


// Define the output schema for the generated insight (ClubUpdate)
export const ClubUpdateSchema = z.object({
    title: z.string().describe("Een korte, strategische titel voor het club-brede inzicht."),
    content: z.string().describe("De gedetailleerde inhoud van het inzicht, geschreven voor een clubverantwoordelijke. Focus op trends, vergelijkingen of aanbevelingen."),
    category: z.enum(['Club Trends', 'Team Comparison', 'Resource Suggestion']).describe("De meest passende categorie voor het inzicht."),
});
export type ClubAnalysisOutput = Omit<z.infer<typeof ClubUpdateSchema>, 'id' | 'date'>;


export async function analyzeClubData(
  input: ClubAnalysisInput
): Promise<ClubAnalysisOutput> {
  return clubAnalysisFlow(input);
}


const insightPrompt = ai.definePrompt({
    name: 'generateClubInsight',
    input: { schema: ClubAnalysisInputSchema },
    output: { schema: ClubUpdateSchema },
    prompt: `
        You are a high-level sports data analyst providing a strategic insight for the responsible of club '{{{clubName}}}'.
        Based on the following weekly wellness summaries from all teams in the club, generate ONE significant, actionable insight.

        **Team Data:**
        {{#each teamSummaries}}
        - **Team: {{this.teamName}}**
          - Average Mood: {{this.summary.averageMood}} (1-5)
          - Average Stress: {{this.summary.averageStress}} (1-5)
          - Average Sleep: {{this.summary.averageSleep}} (1-5)
          - Average Motivation: {{this.summary.averageMotivation}} (1-5)
          - Injuries: {{this.summary.injuryCount}}
          - Common Topics: {{this.summary.commonTopics}}
        {{/each}}

        **Task:**
        1.  Analyze the data to identify the most important club-wide trend, a notable comparison between teams, or a suggestion for a resource.
        2.  Write a short, clear, strategic title for the insight.
        3.  Write concise, actionable 'content' explaining the insight for club management.
        4.  Choose the most appropriate category: 'Club Trends', 'Team Comparison', or 'Resource Suggestion'.
        5.  **Output MUST be in Dutch.**
    `
});


const clubAnalysisFlow = ai.defineFlow(
  {
    name: "clubAnalysisFlow",
    inputSchema: ClubAnalysisInputSchema,
    outputSchema: ClubUpdateSchema,
  },
  async (input) => {
    if (input.teamSummaries.length < 1) {
        throw new Error("Cannot generate club insight with data from less than one team.");
    }

    const { output } = await insightPrompt(input);
    return output!;
  }
);
