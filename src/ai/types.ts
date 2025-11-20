
import { z } from 'genkit';
import type { Gender } from '@/lib/types';

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
});
export type BuddyInput = z.infer<typeof BuddyInputSchema>;

export const ScoreSchema = z.object({
  mood: z.optional(z.number().min(1).max(5)),
  moodReason: z.optional(z.string().describe("The reasoning behind the mood score.")),
  stress: z.optional(z.number().min(1).max(5)),
  stressReason: z.optional(z.string().describe("The reasoning behind the stress score.")),
  sleep: z.optional(z.number().min(1).max(5)),
  sleepReason: z.optional(z.string().describe("The reasoning behind the sleep score.")),
  motivation: z.optional(z.number().min(1).max(5)),
  motivationReason: z.optional(z.string().describe("The reasoning behind the motivation score.")),
  rest: z.optional(z.number().min(1).max(5)),
  restReason: z.optional(z.string().describe("The reasoning behind the rest score.")),
  familyLife: z.optional(z.number().min(1).max(5)),
  familyLifeReason: z.optional(z.string().describe("The reasoning behind the family life score.")),
  school: z.optional(z.number().min(1).max(5)),
  schoolReason: z.optional(z.string().describe("The reasoning behind the school score.")),
  hobbys: z.optional(z.number().min(1).max(5)),
  hobbysReason: z.optional(z.string().describe("The reasoning behind the hobbys score.")),
  food: z.optional(z.number().min(1).max(5)),
  foodReason: z.optional(z.string().describe("The reasoning behind the food score.")),
  injury: z.optional(z.boolean()),
  injuryReason: z.optional(z.string().describe("The reasoning behind the injury status.")),
  freeText: z.optional(z.string()),
  shareWithStaff: z.optional(z.boolean()),
});

export const PlayerInfoSchema = z.object({
    familySituation: z.optional(z.string().describe("Summary of the player's family life and composition.")),
    schoolSituation: z.optional(z.string().describe("Summary of the player's school life and social circle.")),
    personalGoals: z.optional(z.string().describe("Summary of the player's ambitions in football and life.")),
    matchPreparation: z.optional(z.string().describe("Summary of the player's match preparation routines.")),
    recoveryHabits: z.optional(z.string().describe("Summary of how the player recovers after physical activity.")),
    additionalHobbies: z.optional(z.string().describe("Summary of the player's hobbies and relaxation techniques.")),
});

export const AlertSchema = z.object({
  alertType: z
    .enum(['Mental Health', 'Aggression', 'Substance Abuse', 'Extreme Negativity'])
    .describe('The category of the detected alert.'),
  triggeringMessage: z
    .string()
    .describe("The user's message that triggered the alert."),
});
export type Alert = z.infer<typeof AlertSchema>;

export const BuddyOutputSchema = z.object({
  adaptedResponse: z
    .string()
    .describe(
      'An empathetic, context-aware, and psychologically sound response.'
    ),
  scores: ScoreSchema.optional().describe(
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

    
