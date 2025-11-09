import { z } from 'genkit';

export const BuddyInputSchema = z.object({
  buddyName: z.string().describe('The name of the AI buddy.'),
  userName: z.string().describe("The user's name."),
  userAge: z.number().describe("The user's age."),
  userMessage: z.string().describe("The user's latest message."),
  agentResponse: z.string().optional().describe('The previous response from the agent.'),
  chatHistory: z
    .string()
    .optional()
    .describe('The history of the conversation so far.'),
});
export type BuddyInput = z.infer<typeof BuddyInputSchema>;

export const ScoreSchema = z.object({
  mood: z.optional(z.number().min(1).max(5)),
  stress: z.optional(z.number().min(1).max(5)),
  sleep: z.optional(z.number().min(1).max(5)),
  motivation: z.optional(z.number().min(1).max(5)),
  rest: z.optional(z.number().min(1).max(5)),
  familyLife: z.optional(z.number().min(1).max(5)),
  school: z.optional(z.number().min(1).max(5)),
  hobbys: z.optional(z.number().min(1).max(5)),
  food: z.optional(z.number().min(1).max(5)),
  injury: z.optional(z.boolean()),
  freeText: z.optional(z.string()),
  shareWithStaff: z.optional(z.boolean()),
});

export const BuddyOutputSchema = z.object({
  adaptedResponse: z
    .string()
    .describe(
      'An empathetic, context-aware, and psychologically sound response.'
    ),
  scores: ScoreSchema.describe(
    'The scores generated based on the analysis of the latest user message.'
  ),
});
export type BuddyOutput = z.infer<typeof BuddyOutputSchema>;
