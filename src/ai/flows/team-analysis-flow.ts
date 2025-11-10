"use server";
/**
 * @fileOverview A Genkit flow for analyzing team wellness data and generating summaries.
 *
 * - analyzeTeamData - A function that handles the team data analysis.
 * - TeamAnalysisInput - The input type for the analyzeTeamData function.
 * - TeamAnalysisOutput - The return type for the analyzeTeamData function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit";
import { WellnessScoreSchema } from "@/ai/types";

// Define the shape of a single player's data for input
const PlayerWellnessDataSchema = z.object({
  userId: z.string(),
  scores: WellnessScoreSchema,
});

// Define the input for the analysis flow
export const TeamAnalysisInputSchema = z.object({
  teamId: z.string(),
  playersData: z.array(PlayerWellnessDataSchema),
});
export type TeamAnalysisInput = z.infer<typeof TeamAnalysisInputSchema>;

// Define the output schema for the team summary
export const TeamSummarySchema = z.object({
  averageMood: z.number().optional(),
  averageStress: z.number().optional(),
  averageSleep: z.number().optional(),
  averageMotivation: z.number().optional(),
  injuryCount: z.number(),
  commonTopics: z.array(z.string()),
});
export type TeamSummary = z.infer<typeof TeamSummarySchema>;

export const TeamAnalysisOutputSchema = z.object({
  teamId: z.string(),
  summary: TeamSummarySchema,
});
export type TeamAnalysisOutput = z.infer<typeof TeamAnalysisOutputSchema>;


export async function analyzeTeamData(
  input: TeamAnalysisInput
): Promise<TeamAnalysisOutput> {
  return teamAnalysisFlow(input);
}


const teamAnalysisFlow = ai.defineFlow(
  {
    name: "teamAnalysisFlow",
    inputSchema: TeamAnalysisInputSchema,
    outputSchema: TeamAnalysisOutputSchema,
  },
  async (input) => {
    // This is a placeholder implementation.
    // In a real scenario, this would involve more complex logic,
    // potentially calling another LLM to find correlations or generate insights.

    const { playersData } = input;
    const playerCount = playersData.length;

    if (playerCount === 0) {
      return {
        teamId: input.teamId,
        summary: {
            injuryCount: 0,
            commonTopics: [],
        },
      };
    }

    const totals = {
      mood: 0,
      stress: 0,
      sleep: 0,
      motivation: 0,
      moodCount: 0,
      stressCount: 0,
      sleepCount: 0,
      motivationCount: 0,
    };
    let injuryCount = 0;
    const allTopics = new Map<string, number>();

    for (const playerData of playersData) {
      const { scores } = playerData;
      if (scores.mood) {
        totals.mood += scores.mood;
        totals.moodCount++;
      }
      if (scores.stress) {
        totals.stress += scores.stress;
        totals.stressCount++;
      }
       if (scores.sleep) {
        totals.sleep += scores.sleep;
        totals.sleepCount++;
      }
       if (scores.motivation) {
        totals.motivation += scores.motivation;
        totals.motivationCount++;
      }
      if (scores.injury) {
        injuryCount++;
      }
      if (scores.freeText) {
          const topics = scores.freeText.split(" ").filter(t => t.length > 3); // simplistic
          for(const topic of topics) {
              allTopics.set(topic, (allTopics.get(topic) || 0) + 1);
          }
      }
    }

    const summary: TeamSummary = {
      averageMood: totals.moodCount > 0 ? totals.mood / totals.moodCount : undefined,
      averageStress: totals.stressCount > 0 ? totals.stress / totals.stressCount : undefined,
      averageSleep: totals.sleepCount > 0 ? totals.sleep / totals.sleepCount : undefined,
      averageMotivation: totals.motivationCount > 0 ? totals.motivation / totals.motivationCount : undefined,
      injuryCount,
      commonTopics: [...allTopics.entries()].sort((a,b) => b[1] - a[1]).slice(0, 3).map(e => e[0]),
    };

    return {
      teamId: input.teamId,
      summary,
    };
  }
);
