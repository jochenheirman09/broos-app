import { z } from 'genkit';
import type { Schedule } from '@/lib/types';


// Shared Schemas
export const WellnessScoresSchema = z.object({
  mood: z.number().min(1).max(5).optional().describe("Score van 1 (erg negatief) tot 5 (erg positief) voor de algemene stemming."),
  moodReason: z.string().optional().describe("Beknopte reden voor de stemming-score."),
  stress: z.number().min(1).max(5).optional().describe("Score van 1 (weinig stress) tot 5 (veel stress) voor het stressniveau."),
  stressReason: z.string().optional().describe("Beknopte reden voor de stress-score."),
  sleep: z.number().min(1).max(5).optional().describe("Score van 1 (slecht geslapen) tot 5 (goed geslapen) voor de slaapkwaliteit."),
  sleepReason: z.string().optional().describe("Beknopte reden voor de slaap-score."),
  motivation: z.number().min(1).max(5).optional().describe("Score van 1 (niet gemotiveerd) tot 5 (zeer gemotiveerd) voor motivatie."),
  motivationReason: z.string().optional().describe("Beknopte reden voor de motivatie-score."),
  rest: z.number().min(1).max(5).optional().describe("Score van 1 (niet uitgerust) tot 5 (goed uitgerust) voor de mate van rust."),
  restReason: z.string().optional().describe("Beknopte reden voor de rust-score."),
  familyLife: z.number().min(1).max(5).optional().describe("Score van 1 (slecht) tot 5 (goed) voor de situatie thuis."),
  familyLifeReason: z.string().optional().describe("Beknopte reden voor de thuis-score."),
  school: z.number().min(1).max(5).optional().describe("Score van 1 (slecht) tot 5 (goed) voor de situatie op school."),
  schoolReason: z.string().optional().describe("Beknopte reden voor de school-score."),
  hobbys: z.number().min(1).max(5).optional().describe("Score van 1 (slecht) tot 5 (goed) voor hobby's/ontspanning."),
  hobbysReason: z.string().optional().describe("Beknopte reden voor de hobby's-score."),
  food: z.number().min(1).max(5).optional().describe("Score van 1 (slecht) tot 5 (goed) voor voeding."),
  foodReason: z.string().optional().describe("Beknopte reden voor de voeding-score."),
  injury: z.boolean().optional().describe("Geeft aan of de speler een blessure heeft gemeld."),
  injuryReason: z.string().optional().describe("Details over de gemelde blessure."),
});

// For runWellnessAnalysisFlow and runOnboardingFlow
export const WellnessAnalysisInputSchema = z.object({
    buddyName: z.string(),
    userName: z.string(),
    userMessage: z.string(),
    chatHistory: z.string().optional(),
    retrievedDocs: z.any().optional(), // Keeping it simple for now
});
export type WellnessAnalysisInput = z.infer<typeof WellnessAnalysisInputSchema>;

export const WellnessAnalysisOutputSchema = z.object({
  response: z.string().describe('Een vriendelijk en boeiend antwoord in het Nederlands.'),
  summary: z.string().optional().describe("Een beknopte, algehele samenvatting van het gehele gesprek van vandaag."),
  wellnessScores: WellnessScoresSchema.optional(),
  alert: z.object({
    alertType: z.enum(['Mental Health', 'Aggression', 'Substance Abuse', 'Extreme Negativity']),
    triggeringMessage: z.string()
  }).optional(),
});
export type WellnessAnalysisOutput = z.infer<typeof WellnessAnalysisOutputSchema>;

// For runOnboardingFlow
export const OnboardingTopicEnum = z.enum([
  "familySituation",
  "schoolSituation",
  "personalGoals",
  "matchPreparation",
  "recoveryHabits",
  "additionalHobbies",
]);
export type OnboardingTopic = z.infer<typeof OnboardingTopicEnum>;

export const OnboardingInputSchema = WellnessAnalysisInputSchema.extend({
    currentTopic: OnboardingTopicEnum,
});
export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;

export const OnboardingOutputSchema = z.object({
  response: z.string(),
  isTopicComplete: z.boolean(),
  summary: z.string().optional(),
});
export type OnboardingOutput = z.infer<typeof OnboardingOutputSchema>;


// For analyzeTeamData flow
export const TeamAnalysisInputSchema = z.object({
    teamId: z.string(),
    teamName: z.string(),
    playersData: z.array(z.object({
        name: z.string(),
        scores: WellnessScoresSchema,
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
  playerScores: WellnessScoresSchema,
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