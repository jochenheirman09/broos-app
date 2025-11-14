"use server";
/**
 * @fileOverview A Genkit flow for analyzing team wellness data and generating summaries and insights.
 *
 * - analyzeTeamData - A function that handles the team data analysis.
 */

import { type TeamAnalysisInput, type TeamAnalysisOutput } from "@/ai/types";
import { teamAnalysisFlow } from './team-analysis-flow-internal'; // <<< NEW IMPORT

export async function analyzeTeamData(
  input: TeamAnalysisInput
): Promise<TeamAnalysisOutput> {
  return teamAnalysisFlow(input);
}
// All flow and prompt definitions are now in team-analysis-flow-internal.ts