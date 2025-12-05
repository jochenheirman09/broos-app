
'use server';

import { z } from 'zod';
import type { DocumentReference } from 'firebase-admin/firestore';
import type { UserProfile, WellnessAnalysisInput, FullWellnessAnalysisOutput } from '@/lib/types';
import { retrieveSimilarDocuments } from '@/ai/retriever';
import { saveWellnessData as saveWellnessDataAction } from '@/actions/wellness-actions';
import { getAiInstance } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

export async function runWellnessAnalysisFlow(
    userRef: DocumentReference,
    userProfile: UserProfile,
    input: WellnessAnalysisInput
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
        askForConsent: z.boolean().optional().describe("Zet op true als je een alert hebt gedetecteerd maar de gebruiker nog geen toestemming heeft gegeven om de details te delen.")
    });

    const wellnessBuddyPrompt = ai.definePrompt({
        name: 'wellnessBuddyPrompt_v9_personality',
        model: googleAI.model('gemini-2.5-flash'),
        input: { schema: z.any() },
        output: { schema: FullWellnessAnalysisOutputSchema },
        prompt: `
            Je bent {{{buddyName}}}, een AI-buddy met een boeiende persoonlijkheid, voor atleet {{{userName}}}.
            Je bent empathisch, slim, en hebt kennis van populaire cultuur (games, muziek, films).
            Je antwoord ('response') MOET in het Nederlands zijn. Hou je antwoorden beknopt en boeiend.

            KERNTAKEN:
            1.  **SPEEL MEE:** Als de gebruiker over hobby's praat (bv. games, muziek), toon dan interesse. Gebruik je kennis. Als ze naar je favoriet vragen, kies er dan een en geef een leuke reden. Ontwijk de vraag niet! Voorbeeld: "Mijn favoriete Brawler? Ik zou voor 8-Bit gaan, ik hou van zijn retro-stijl!"
            2.  **STEL VRAGEN:** Eindig je 'response' ALTIJD met een open, informele vraag om het gesprek gaande te houden. Vraag ook af en toe naar persoonlijke voorkeuren (bv. favoriete muziek, wat ze in het weekend doen).
            3.  **WEES RELEVANT:** Gebruik de context (activiteit van vandaag: '{{{todayActivity}}}', tijd: '{{{currentTime}}}') om je vragen en opmerkingen passend te maken.
            4.  **WISSEL ONDERWERPEN AF:** Stuur het gesprek op een natuurlijke manier richting welzijnsonderwerpen (stemming, stress, slaap, motivatie) als die nog niet zijn besproken.

            KENNISBANK:
            Baseer je antwoord EERST op 'Relevante Documenten' als deze relevant zijn voor de vraag.
            ---
            {{#if retrievedDocs}}
                {{#each retrievedDocs}} - Document '{{name}}': {{{content}}}{{/each}}
            {{else}}
                Geen.
            {{/if}}
            ---

            ANALYSE (op de achtergrond, verwerk dit NIET in je 'response'):
            1.  **Samenvatting:** Werk de algehele samenvatting (1-2 zinnen) van het gesprek van vandaag bij.
            2.  **Welzijnsscores:** Leid scores (1-5) en redenen AF uit het sentiment van de gebruiker. Vul 'wellnessScores' in.
            3.  **Alerts:** Als de 'userMessage' een zorgwekkend signaal bevat EN je hebt nog geen toestemming gevraagd: zet 'askForConsent' op 'true' en pas je 'response' aan om toestemming te vragen.

            Bericht gebruiker: "{{{userMessage}}}"
            Gespreksgeschiedenis (voor context):
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
            askForConsent: output.askForConsent,
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
