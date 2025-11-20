import { ai } from "@/ai/genkit";
import { z } from "genkit";
import {
  TeamAnalysisInputSchema,
  TeamSummarySchema,
  StaffUpdateSchema,
  TeamAnalysisOutputSchema,
  type TeamAnalysisInput,
  type TeamAnalysisOutput,
  type TeamSummary,
  type StaffUpdate,
  WellnessScoreSchema,
} from "@/ai/types";

const insightPrompt = ai.definePrompt({
  name: 'generateStaffInsight',
  input: { schema: z.object({ teamName: z.string(), summary: TeamSummarySchema, playerCount: z.number() }) },
  output: { schema: StaffUpdateSchema },
  prompt: `
        You are a sports data analyst creating a concise insight for a youth football coach.
        Based on the following weekly wellness summary for team '{{{teamName}}}' with {{{playerCount}}} players, generate one actionable insight.

        **Data:**
        - Average Mood: {{{summary.averageMood}}} (1-5 scale)
        - Average Stress: {{{summary.averageStress}}} (1-5 scale)
        - Average Sleep: {{{summary.averageSleep}}} (1-5 scale)
        - Average Motivation: {{{summary.averageMotivation}}} (1-5 scale)
        - Total Injuries: {{{summary.injuryCount}}}
        - Common Topics Discussed: {{{summary.commonTopics}}}

        **Task:**
        1.  Analyze the data to find the most significant trend, risk, or positive point.
        2.  Write a short, clear title.
        3.  Write a concise, actionable 'content' explaining the insight. If a score is low, suggest action. If it's high, give encouragement. If there's a risk, highlight it.
        4.  Choose the most appropriate category: 'Player Wellness', 'Injury Risk', 'Team Performance'.
        5.  **Output must be in Dutch.**
    `,
});

export const teamAnalysisFlow = ai.defineFlow(
  {
    name: "teamAnalysisFlow",
    inputSchema: TeamAnalysisInputSchema,
    outputSchema: TeamAnalysisOutputSchema,
  },
  async (input) => {
    const { playersData, teamId, teamName } = input;
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
      if (scores.mood) { totals.mood += scores.mood; totals.moodCount++; }
      if (scores.stress) { totals.stress += scores.stress; totals.stressCount++; }
      if (scores.sleep) { totals.sleep += scores.sleep; totals.sleepCount++; }
      if (scores.motivation) { totals.motivation += scores.motivation; totals.motivationCount++; }
      if (scores.injury) { injuryCount++; }
      if (scores.freeText) {
        const topics = scores.freeText.split(" ").filter(t => t.length > 3);
        for (const topic of topics) {
          allTopics.set(topic, (allTopics.get(topic) || 0) + 1);
        }
      }
    }

    const summary: TeamSummary = {
      averageMood: totals.moodCount > 0 ? parseFloat((totals.mood / totals.moodCount).toFixed(1)) : undefined,
      averageStress: totals.stressCount > 0 ? parseFloat((totals.stress / totals.stressCount).toFixed(1)) : undefined,
      averageSleep: totals.sleepCount > 0 ? parseFloat((totals.sleep / totals.sleepCount).toFixed(1)) : undefined,
      averageMotivation: totals.motivationCount > 0 ? parseFloat((totals.motivation / totals.motivationCount).toFixed(1)) : undefined,
      injuryCount,
      commonTopics: [...allTopics.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(e => e[0]),
    };

    // Now, call the insight prompt
    let insight: StaffUpdate | undefined = undefined;
    try {
      const insightResult = await insightPrompt({ teamName, summary, playerCount });
      insight = insightResult.output;
    } catch (e) {
      console.error("Failed to generate staff insight:", e);
      // Do not block the flow, just return summary
    }

    return {
      teamId: input.teamId,
      summary,
      insight,
    };
  }
);
