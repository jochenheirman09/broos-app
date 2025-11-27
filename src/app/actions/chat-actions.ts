
'use server';

import { z } from 'zod';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import type { WellnessAnalysisInput, WellnessAnalysisOutput, FullWellnessAnalysisOutput } from '@/lib/types';


export async function chatWithBuddy(
  userId: string,
  input: WellnessAnalysisInput,
): Promise<WellnessAnalysisOutput> {
  console.log(`[Chat Action - STAP 3A] Received message: ${input.userMessage}`);

  // Alle Genkit en Zod definities staan nu binnen de async functie om build-fouten te voorkomen.
  const ai = genkit({
    plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
    logLevel: 'debug',
    enableTracingAndMetrics: true,
  });

  const WellnessScoresSchema = z.object({
    mood: z.number().min(1).max(5).optional().describe("Score van 1 (erg negatief) tot 5 (erg positief) voor de algemene stemming."),
    moodReason: z.string().optional().describe("Beknopte reden voor de stemming-score."),
    stress: z.number().min(1).max(5).optional().describe("Score van 1 (weinig stress) tot 5 (veel stress) voor het stressniveau."),
    stressReason: z.string().optional().describe("Beknopte reden voor de stress-score."),
    sleep: z.number().min(1).max(5).optional().describe("Score van 1 (slecht geslapen) tot 5 (goed geslapen) voor de slaapkwaliteit."),
    sleepReason: z.string().optional().describe("Beknopte reden voor de slaap-score."),
    motivation: z.number().min(1).max(5).optional().describe("Score van 1 (niet gemotiveerd) tot 5 (zeer gemotiveerd) voor motivatie."),
    motivationReason: z.string().optional().describe("Beknopte reden voor de motivatie-score."),
  });
  
  const FullWellnessAnalysisOutputSchema = z.object({
    response: z.string().describe("Het antwoord van de AI buddy op de gebruiker."),
    summary: z.string().optional().describe("Een beknopte, algehele samenvatting van het gehele gesprek van vandaag."),
    wellnessScores: WellnessScoresSchema.optional(),
    alert: z.object({
      alertType: z.enum(['Mental Health', 'Aggression', 'Substance Abuse', 'Extreme Negativity']),
      triggeringMessage: z.string()
    }).optional(),
  });
  
  const wellnessBuddyPrompt = ai.definePrompt({
      name: 'wellnessBuddyPrompt_Step3a_Revert',
      model: 'googleai/gemini-2.5-flash',
      input: { schema: z.any() },
      output: { schema: FullWellnessAnalysisOutputSchema },
      prompt: `
          Je bent {{{buddyName}}}, een vriendelijke en behulpzame AI-buddy.
          Je antwoord ('response') MOET in het Nederlands zijn. Hou je antwoorden beknopt en boeiend.

          ANALYSEER het gesprek op de achtergrond.
          1.  **Samenvatting:** Geef een beknopte, algehele samenvatting (1-2 zinnen) van het gehele gesprek van vandaag in het 'summary' veld.
          2.  **Welzijnsscores:** Extraheer scores (1-5) en redenen voor welzijnsaspecten. Vul ALLEEN de velden in 'wellnessScores' waarover de gebruiker expliciete informatie geeft.
          3.  **Alerts:** Analyseer de 'userMessage' op zorgwekkende signalen. Als je een duidelijk signaal detecteert, vul dan het 'alert' object.

          Naam gebruiker: {{{userName}}}
          Bericht gebruiker: "{{{userMessage}}}"
          Gespreksgeschiedenis (voor context):
          {{{chatHistory}}}
      `,
  });

  try {
    const { output } = await wellnessBuddyPrompt(input);
    
    if (!output?.response) {
      throw new Error("AI returned no valid response text.");
    }
    
    // Voor nu loggen we alleen de volledige output om te verifiëren.
    console.log('[Chat Action - STAP 3A] Full AI Output for verification:', JSON.stringify(output, null, 2));

    // We slaan de data nog NIET op. We geven alleen de tekstrespons terug.
    return {
      response: output.response,
    };

  } catch (error: any) {
    const detail = error.message || 'Unknown error';
    console.error(`[Chat Action - STAP 3A] CRITICAL ERROR IN AI FLOW:`, error);
    throw new Error(`Kon de AI-buddy niet bereiken. Fout: ${detail}`);
  }
}
