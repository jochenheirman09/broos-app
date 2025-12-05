import { z } from 'genkit';
import type { Schedule } from '@/lib/types';


// Shared Schemas for AI prompt input/output validation.
// These should ONLY be used within server actions where the AI is called.

// For analyzeTeamData flow
export const TeamAnalysisInputSchema = z.object({
    teamId: z.string(),
    teamName: z.string(),
    playersData: z.array(z.object({
        name: z.string(),
        scores: z.any(), // Keeping this simple, validation is on the server action
    }))
});
export type TeamAnalysisInput = z.infer<typeof TeamAnalysisInputSchema>;

export const TeamSummarySchema = z.object({
    averageMood: z.number(),
    averageStress: z.number(),
    averageSleep: z.number(),
    averageMotivation: z.number(),
    injuryCount: z.number(),
    commonTopics: z.array(z.string()),
});
export type AITeamSummary = z.infer<typeof TeamSummarySchema>;

export const TeamInsightSchema = z.object({
    title: z.string(),
    content: z.string(),
    category: z.enum(['Team Performance', 'Player Wellness', 'Injury Risk']),
});
export type TeamInsight = z.infer<typeof TeamInsightSchema>;

export const TeamAnalysisOutputSchema = z.object({
    summary: TeamSummarySchema,
    insight: TeamInsightSchema
});
export type TeamAnalysisOutput = z.infer<typeof TeamAnalysisOutputSchema>;


// For analyzeClubData flow
export const ClubAnalysisInputSchema = z.object({
  clubId: z.string(),
  clubName: z.string(),
  teamSummaries: z.array(z.object({
    teamName: z.string(),
    summary: TeamSummarySchema,
  }))
});
export type ClubAnalysisInput = z.infer<typeof ClubAnalysisInputSchema>;

export const ClubInsightSchema = z.object({
  title: z.string(),
  content: z.string(),
  category: z.enum(['Club Trends', 'Team Comparison', 'Resource Suggestion']),
});
export type ClubInsight = z.infer<typeof ClubInsightSchema>;

// For generatePlayerUpdate flow
export const PlayerUpdateInputSchema = z.object({
  playerName: z.string(),
  playerScores: z.any(),
  teamAverageScores: TeamSummarySchema,
});
export type PlayerUpdateInput = z.infer<typeof PlayerUpdateInputSchema>;

export const PlayerUpdateOutputSchema = z.object({
  title: z.string(),
  content: z.string(),
  category: z.enum(['Sleep', 'Nutrition', 'Motivation', 'Stress', 'Wellness']),
});
export type PlayerUpdateOutput = z.infer<typeof PlayerUpdateOutputSchema>;

// For ingestDocument flow
export const IngestInputSchema = z.object({
  fileName: z.string(),
  fileContent: z.string(),
  clubId: z.string(),
});
export type IngestInput = z.infer<typeof IngestInputSchema>;

// For sendNotification flow
export const NotificationInputSchema = z.object({
  userId: z.string(),
  title: z.string(),
  body: z.string(),
  link: z.string().optional(),
});
export type NotificationInput = z.infer<typeof NotificationInputSchema>;

