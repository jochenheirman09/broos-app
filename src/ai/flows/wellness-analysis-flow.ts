
'use server';

import { z } from 'zod';
import type { DocumentReference } from 'firebase-admin/firestore';
import type { UserProfile, WellnessAnalysisInput, FullWellnessAnalysisOutput } from '@/lib/types';
import { retrieveSimilarDocuments } from '@/ai/retriever';
import { saveWellnessData as saveWellnessDataAction } from '@/app/actions/wellness-actions';
import { getAiInstance } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

export async function runWellnessAnalysisFlow(
    userRef: DocumentReference,
    userProfile: UserProfile,
    input: WellnessAnalysisInput & { todayActivity?: string }
): Promise<FullWellnessAnalysisOutput> {
    
    const ai = await getAiInstance();

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
        name: 'wellnessBuddyPrompt_v3_schedule_aware',
        model: googleAI.model('gemini-2.5-flash'),
        input: { schema: z.any() },
        output: { schema: FullWellnessAnalysisOutputSchema },
        prompt: `
            Je bent {{{buddyName}}}, een vriendelijke en behulpzame AI-buddy.
            Je antwoord ('response') MOET in het Nederlands zijn. Hou je antwoorden beknopt en boeiend.

            BELANGRIJKE CONTEXT: De activiteit van de speler voor vandaag is '{{{todayActivity}}}'. Gebruik deze informatie om je vragen relevanter te maken. Bijvoorbeeld, vraag 'Hoe ging de training?' in plaats van 'Hoe was je dag?'.

            BELANGRIJK: Baseer je antwoord EERST op de informatie uit 'Relevante Documenten' als deze relevant is voor de vraag van de gebruiker. Gebruik anders je algemene kennis.

            Relevante Documenten (uit de kennisbank):
            ---
            {{#if retrievedDocs}}
                {{#each retrievedDocs}}
                - Document '{{name}}': {{{content}}}
                {{/each}}
            {{else}}
                Geen relevante documenten gevonden.
            {{/if}}
            ---

            ANALYSEER het gesprek op de achtergrond.
            1.  **Samenvatting:** Geef een beknopte, algehele samenvatting (1-2 zinnen) van het gehele gesprek van vandaag in het 'summary' veld.
            2.  **Welzijnsscores:** Extraheer scores (1-5) en redenen voor welzijnsaspecten. Vul ALLEEN de velden in 'wellnessScores' waarover de gebruiker expliciete informatie geeft.
            3.  **Alerts:** Analyseer de 'userMessage' op zorgwekkende signalen. Als je een duidelijk signaal detecteert, vul dan het 'alert' object met de 'alertType' en 'triggeringMessage'.

            Naam gebruiker: {{{userName}}}
            Bericht gebruiker: "{{{userMessage}}}"
            Gespreksgeschiedenis (voor context, hoeft niet herhaald te worden):
            {{{chatHistory}}}
        `,
    });

    try {
        const retrievedDocs = await retrieveSimilarDocuments(input.userMessage, userProfile.clubId || '');
        const augmentedInput = { ...input, retrievedDocs };
        
        const { output } = await wellnessBuddyPrompt(augmentedInput);
        if (!output) {
            throw new Error("Wellness prompt returned no output.");
        }
        
        // This is a fire-and-forget call to the isolated server action
        saveWellnessDataAction({
            userId: userRef.id,
            userMessage: input.userMessage,
            assistantResponse: output.response,
            summary: output.summary,
            wellnessScores: output.wellnessScores,
            alert: output.alert,
        }).catch(err => {
            console.error("[Wellness Flow] Background data save via action failed:", err);
        });
        
        return output;

    } catch (error: any) {
        const detail = error.message || 'Unknown error';
        console.error(`[Wellness Flow] CRITICAL ERROR:`, error);
        throw new Error(`Kon de AI-buddy niet bereiken. Server-log bevat details. Fout: ${detail}`);
    }
}
