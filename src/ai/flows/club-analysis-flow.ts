
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
import {
  ClubAnalysisInputSchema,
  ClubUpdateSchema,
  type ClubAnalysisInput,
  type ClubAnalysisOutput,
} from '@/ai/types';


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
        4.  Choose the most appropriate category: 'Club Trends', 'Team Comparison', of 'Resource Suggestion'.
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
