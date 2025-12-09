
'use server';

import { z } from 'zod';
import type { DocumentReference } from 'firebase-admin/firestore';
import { saveOnboardingSummary } from '@/services/firestore-service';
import type { UserProfile, WellnessAnalysisInput, OnboardingInput, OnboardingOutput, OnboardingTopic } from '@/lib/types';
import { getAiInstance } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai'; 

export async function runOnboardingFlow(
    userRef: DocumentReference,
    userProfile: UserProfile,
    input: WellnessAnalysisInput
): Promise<OnboardingOutput> {

    const ai = await getAiInstance();
    
    const OnboardingOutputSchema = z.object({
        response: z.string().describe("Het antwoord van de AI-buddy."),
        isTopicComplete: z.boolean().describe("True als het onderwerp voldoende is besproken."),
        summary: z.string().optional().describe("Een beknopte samenvatting (1-2 zinnen) van de input van de gebruiker voor het huidige onderwerp, alleen als isTopicComplete waar is."),
        siblings: z.array(z.object({ name: z.string(), age: z.number().optional() })).optional().describe("Een lijst met broers/zussen die in het gesprek zijn genoemd."),
        pets: z.array(z.object({ name: z.string(), type: z.string() })).optional().describe("Een lijst met huisdieren die in het gesprek zijn genoemd (bv. hond, kat)."),
    });

    const onboardingTopics: OnboardingTopic[] = [
        "familySituation", "schoolSituation", "personalGoals", 
        "matchPreparation", "recoveryHabits", "additionalHobbies"
    ];
    
    const nextTopic = onboardingTopics.find(topic => !userProfile[topic]);

    if (!nextTopic) {
        console.warn("[Onboarding Flow] Onboarding is already complete, but flow was called.");
        return { response: "Het lijkt erop dat we elkaar al kennen! Waar wil je het vandaag over hebben?", isTopicComplete: true, summary: "Onboarding was al voltooid.", isLastTopic: true, lastTopic: 'additionalHobbies' };
    }

    const onboardingBuddyPrompt = ai.definePrompt({
        name: 'onboardingBuddyPrompt_v5_details',
        model: googleAI.model('gemini-2.5-flash'),
        input: { schema: z.any() },
        output: { schema: OnboardingOutputSchema },
        prompt: `
            Je bent een empathische AI-psycholoog voor een jonge atleet genaamd {{{userName}}}.
            Je doel is om een natuurlijke, ondersteunende conversatie te hebben om de gebruiker beter te leren kennen.
            Je antwoord ('response') MOET in het Nederlands zijn.

            HUIDIG ONDERWERP: '{{{currentTopic}}}'.

            TAAK:
            1.  **Houd het gesprek luchtig en informeel.** Stel open vragen.
            2.  **Verzamel Details:** Als het onderwerp 'familySituation' is en de gebruiker noemt broers, zussen of huisdieren, vraag dan op een natuurlijke manier naar hun naam, leeftijd (voor broers/zussen) en type (voor huisdieren). EXTRAHEER deze data naar de 'siblings' en 'pets' velden.
            3.  **Rond Zelf Af:** Bepaal zelf wanneer een onderwerp is afgerond (meestal na 1-3 antwoorden). Stel 'isTopicComplete' in op true.
            4.  **Vloeiende Overgang:** Als 'isTopicComplete' waar is:
                -   Maak een vloeiende overgang in je 'response' door een open vraag te stellen over het VOLGENDE onderwerp. ZEG NIET "Laten we verdergaan".
                -   Geef een beknopte samenvatting (1-2 zinnen) in het 'summary' veld.
            5.  **Houd het Gaande:** Als 'isTopicComplete' false is, stel dan een korte, relevante vervolgvraag over het huidige onderwerp.

            Bericht gebruiker: "{{{userMessage}}}"
            Gespreksgeschiedenis (voor context):
            {{{chatHistory}}}
        `,
    });
    
    const onboardingInput: OnboardingInput = { ...input, currentTopic: nextTopic };
    
    const { output } = await onboardingBuddyPrompt(onboardingInput);

    if (!output) throw new Error("Onboarding prompt returned no output.");

    const isLastTopic = nextTopic === 'additionalHobbies' && output.isTopicComplete;

    if (output.isTopicComplete) {
        const dataToSave = {
            summary: output.summary,
            siblings: output.siblings,
            pets: output.pets
        };
        // Fire-and-forget the save operation.
        saveOnboardingSummary(userRef, nextTopic, dataToSave, isLastTopic).catch(err => {
            console.error(`[Onboarding Flow] Background save failed for user ${userRef.id}:`, err);
        });
    }

    return { ...output, isLastTopic, lastTopic: nextTopic };
}
