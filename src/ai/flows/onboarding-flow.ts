
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
    
    // Simplified schema for stability. The AI's only job is to talk and determine completion.
    const OnboardingOutputSchema = z.object({
        response: z.string().describe("Het antwoord van de AI-buddy."),
        isTopicComplete: z.boolean().describe("True als het onderwerp voldoende is besproken."),
        summary: z.string().optional().describe("Een beknopte samenvatting (1-2 zinnen) van de input van de gebruiker, alleen als isTopicComplete waar is."),
    });

    const onboardingTopics: OnboardingTopic[] = [
        "familySituation", "schoolSituation", "personalGoals", 
        "matchPreparation", "recoveryHabits", "additionalHobbies"
    ];
    
    const nextTopic = onboardingTopics.find(topic => !userProfile[topic]);

    if (!nextTopic) {
        console.warn("[Onboarding Flow] Onboarding is already complete, but flow was called.");
        return { response: "Het lijkt erop dat we elkaar al kennen! Waar wil je het vandaag over hebben?", isTopicComplete: true, summary: "Onboarding was al voltooid." };
    }

    const onboardingBuddyPrompt = ai.definePrompt({
        name: 'onboardingBuddyPrompt_v6_stable',
        model: googleAI.model('gemini-2.5-flash'),
        input: { schema: z.any() },
        output: { schema: OnboardingOutputSchema },
        prompt: `
            Je bent een empathische AI-psycholoog voor een jonge atleet.
            Je doel is om een natuurlijke, ondersteunende conversatie te hebben om de gebruiker te leren kennen.
            Je antwoord ('response') MOET in het Nederlands zijn.

            HUIDIG ONDERWERP: '{{{currentTopic}}}'.

            TAAK:
            1.  **Houd het gesprek luchtig en informeel.** Stel een open vraag over het onderwerp.
            2.  **Rond Zelf Af:** Bepaal na het antwoord van de gebruiker of het onderwerp is afgerond (meestal na 1 antwoord). Stel dan 'isTopicComplete' in op true.
            3.  **Vloeiende Overgang:** Als 'isTopicComplete' waar is:
                -   Genereer een beknopte samenvatting (1-2 zinnen) in het 'summary' veld.
                -   Maak in je 'response' een natuurlijke overgang naar het volgende onderwerp zonder expliciet te zeggen "volgende onderwerp". Bijvoorbeeld: "Oké, interessant. En hoe zit het met school en je vrienden?"
            4.  **Houd het Gaande:** Als je denkt dat één korte vervolgvraag nodig is, stel 'isTopicComplete' dan in op 'false'.

            Bericht gebruiker: "{{{userMessage}}}"
            Gespreksgeschiedenis (voor context):
            {{{chatHistory}}}
        `,
    });
    
    const onboardingInput: OnboardingInput = { ...input, currentTopic: nextTopic };
    
    const { output } = await onboardingBuddyPrompt(onboardingInput);

    if (!output) throw new Error("Onboarding prompt returned no output.");

    const isLastTopic = nextTopic === 'additionalHobbies' && output.isTopicComplete;

    if (output.isTopicComplete && output.summary) {
        // Fire-and-forget the save operation.
        saveOnboardingSummary(userRef, nextTopic, { summary: output.summary }, isLastTopic).catch(err => {
            console.error(`[Onboarding Flow] Background save failed for user ${userRef.id}:`, err);
        });
    }

    return { 
      response: output.response || "", 
      isTopicComplete: output.isTopicComplete ?? false,
      isLastTopic, 
      lastTopic: nextTopic 
    };
}
