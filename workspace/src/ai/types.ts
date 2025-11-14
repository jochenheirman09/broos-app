
import { z } from 'genkit';
import type { Gender } from '@/lib/types';

// Schema for Wellness Scores - This is now the single source of truth.
export const WellnessScoreSchema = z.object({
  mood: z.optional(z.number().min(1).max(5)).describe("Score for mood."),
  moodReason: z.optional(z.string()).describe("Reason for mood score."),
  stress: z.optional(z.number().min(1).max(5)).describe("Score for stress."),
  stressReason: z.optional(z.string()).describe("Reason for stress score."),
  sleep: z.optional(z.number().min(1).max(5)).describe("Score for sleep quality."),
  sleepReason: z.optional(z.string()).describe("Reason for sleep score."),
  motivation: z.optional(z.number().min(1).max(5)).describe("Score for motivation."),
  motivationReason: z.optional(z.string()).describe("Reason for motivation score."),
  rest: z.optional(z.number().min(1).max(5)).describe("Score for rest."),
  restReason: z.optional(z.string()).describe("Reason for rest score."),
  familyLife: z.optional(z.number().min(1).max(5)).describe("Score for family life."),
  familyLifeReason: z.optional(z.string()).describe("Reason for family life score."),
  school: z.optional(z.number().min(1).max(5)).describe("Score for school situation."),
  schoolReason: z.optional(z.string()).describe("Reason for school score."),
  hobbys: z.optional(z.number().min(1).max(5)).describe("Score for hobbies."),
  hobbysReason: z.optional(z.string()).describe("Reason for hobbies score."),
  food: z.optional(z.number().min(1).max(5)).describe("Score for nutrition."),
  foodReason: z.optional(z.string()).describe("Reason for nutrition score."),
  injury: z.optional(z.boolean()).describe("Is the player injured?"),
  injuryReason: z.optional(z.string()).describe("Reason for injury status."),
  freeText: z.optional(z.string()).describe("Free text input from the user."),
  shareWithStaff: z.optional(z.boolean()).describe("Whether to share info with staff."),
});
export type WellnessScore = z.infer<typeof WellnessScoreSchema>;


// Schema for Buddy Flow Input
export const BuddyInputSchema = z.object({
  buddyName: z.string().describe('The name of the AI buddy.'),
  userName: z.string().describe("The user's name."),
  userAge: z.number().describe("The user's age."),
  userGender: z.custom<Gender>().describe("The user's gender, either 'male' or 'female'."),
  userMessage: z.string().describe("The user's latest message."),
  agentResponse: z.string().optional().describe('The previous response from the agent.'),
  chatHistory: z
    .string()
    .optional()
    .describe('The history of the conversation so far.'),
  onboardingCompleted: z.boolean().describe("Flag indicating if the initial 'get-to-know-you' chat sequence is complete."),
  knowledgeBaseContext: z.string().optional().describe('Context retrieved from the knowledge base.'),
});
export type BuddyInput = z.infer<typeof BuddyInputSchema>;

// Schema for Player Info gathered during onboarding
export const PlayerInfoSchema = z.object({
    familySituation: z.optional(z.string().describe("Summary of the player's family life and composition.")),
    schoolSituation: z.optional(z.string().describe("Summary of the player's school life and social circle.")),
    personalGoals: z.optional(z.string().describe("Summary of the player's ambitions in football and life.")),
    matchPreparation: z.optional(z.string().describe("Summary of the player's match preparation routines.")),
    recoveryHabits: z.optional(z.string().describe("Summary of how the player recovers after physical activity.")),
    additionalHobbies: z.optional(z.string().describe("Summary of the player's hobbies and relaxation techniques.")),
});
export type PlayerInfo = z.infer<typeof PlayerInfoSchema>;

// Schema for Alerts
export const AlertSchema = z.object({
  alertType: z
    .enum(['Mental Health', 'Aggression', 'Substance Abuse', 'Extreme Negativity'])
    .describe('The category of the detected alert.'),
  triggeringMessage: z
    .string()
    .describe("The user's message that triggered the alert."),
});
export type Alert = z.infer<typeof AlertSchema>;

// Schema for Buddy Flow Output
export const BuddyOutputSchema = z.object({
  adaptedResponse: z
    .string()
    .describe(
      'An empathetic, context-aware, and psychologically sound response.'
    ),
  scores: WellnessScoreSchema.optional().describe(
    'The scores and reasoning generated based on the analysis of the latest user message.'
  ),
  playerInfo: PlayerInfoSchema.optional().describe(
    'Summaries of the player\'s background information, gathered during onboarding.'
  ),
  alerts: z
    .array(AlertSchema)
    .optional()
    .describe(
      'A list of alerts generated if the user message contains alarming signs.'
    ),
  onboardingCompleted: z.boolean().optional().describe(
      "Set to true when the AI determines the initial 'get-to-know-you' phase is complete."
  )
});
export type BuddyOutput = z.infer<typeof BuddyOutputSchema>;

// Schema for Notification Flow
export const NotificationInputSchema = z.object({
  userId: z.string(),
  title: z.string(),
  body: z.string(),
  link: z.string().optional(),
});
export type NotificationInput = z.infer<typeof NotificationInputSchema>;

// Schemas for Team Analysis Flow
export const PlayerWellnessDataSchema = z.object({
  userId: z.string(),
  name: z.string(),
  scores: WellnessScoreSchema,
});
export type PlayerWellnessData = z.infer<typeof PlayerWellnessDataSchema>;


export const TeamAnalysisInputSchema = z.object({
  teamId: z.string(),
  teamName: z.string(),
  playersData: z.array(PlayerWellnessDataSchema),
});
export type TeamAnalysisInput = z.infer<typeof TeamAnalysisInputSchema>;

export const TeamSummarySchema = z.object({
  averageMood: z.number().optional(),
  averageStress: z.number().optional(),
  averageSleep: z.number().optional(),
  averageMotivation: z.number().optional(),
  injuryCount: z.number(),
  commonTopics: z.array(z.string()),
});
export type TeamSummary = z.infer<typeof TeamSummarySchema>;

export const StaffUpdateSchema = z.object({
    title: z.string().describe("Een korte, pakkende titel voor het inzicht."),
    content: z.string().describe("De gedetailleerde inhoud van het inzicht, geschreven voor een staflid/coach."),
    category: z.enum(['Team Performance', 'Player Wellness', 'Injury Risk']).describe("De categorie van het inzicht."),
});
export type StaffUpdate = Omit<z.infer<typeof StaffUpdateSchema>, 'id' | 'date'>;

export const TeamAnalysisOutputSchema = z.object({
  teamId: z.string(),
  summary: TeamSummarySchema,
  insight: StaffUpdateSchema.optional(),
});
export type TeamAnalysisOutput = z.infer<typeof TeamAnalysisOutputSchema>;

// Schemas for Club Analysis Flow
export const ClubAnalysisInputSchema = z.object({
  clubId: z.string(),
  clubName: z.string(),
  teamSummaries: z.array(z.object({
      teamName: z.string(),
      summary: TeamSummarySchema,
  })),
});
export type ClubAnalysisInput = z.infer<typeof ClubAnalysisInputSchema>;

export const ClubUpdateSchema = z.object({
    title: z.string().describe("Een korte, strategische titel voor het club-brede inzicht."),
    content: z.string().describe("De gedetailleerde inhoud van het inzicht, geschreven voor een clubverantwoordelijke. Focus op trends, vergelijkingen of aanbevelingen."),
    category: z.enum(['Club Trends', 'Team Comparison', 'Resource Suggestion']).describe("De meest passende categorie voor het inzicht."),
});
export type ClubAnalysisOutput = Omit<z.infer<typeof ClubUpdateSchema>, 'id' | 'date'>;

// Schema for Ingest Flow
export const DocInputSchema = z.object({
  url: z.string().describe("The URL of the document to ingest."),
});
export type DocInput = z.infer<typeof DocInputSchema>;
