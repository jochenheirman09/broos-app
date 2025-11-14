'use server';
/**
 * @fileOverview A Genkit flow for analyzing aggregated team data at the club level
 * to generate high-level insights for the club responsible.
 */

import { type ClubAnalysisInput, type ClubAnalysisOutput } from '@/ai/types';
import { clubAnalysisFlow } from './club-analysis-flow-internal'; // <<< NEW IMPORT

export async function analyzeClubData(
  input: ClubAnalysisInput
): Promise<ClubAnalysisOutput> {
  return clubAnalysisFlow(input);
}
// All flow and prompt definitions are now in club-analysis-flow-internal.ts