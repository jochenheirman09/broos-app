
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
        summary: z.string().optional().describe("Een beknopte samenvatting (2-3 zinnen) van de input van de gebruiker voor het huidige onderwerp, alleen als isTopicComplete waar is."),
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
        name: 'onboardingBuddyPrompt_v2_isolated',
        model: googleAI.model('gemini-2.5-flash'),
        input: { schema: z.any() },
        output: { schema: OnboardingOutputSchema },
        prompt: `
            Je bent een empathische AI-psycholoog voor een jonge atleet genaamd {{{userName}}}.
            Je doel is om een natuurlijke, ondersteunende conversatie te hebben om de gebruiker beter te leren kennen.
            Je antwoord ('response') MOET in het Nederlands zijn.

            Het huidige onderwerp is '{{{currentTopic}}}'.
            - Leid het gesprek op een natuurlijke manier rond dit onderwerp. Stel vervolgvragen als de reactie van de gebruiker kort is.
            - BELANGRIJK: Wees niet te opdringerig. Als de gebruiker aangeeft niet verder te willen praten over een detail, of als een onderwerp een simpele, alledaagse kwestie lijkt (zoals een ruzie met een broer), respecteer dat dan en rond het onderwerp af.
            - Als je vindt dat het onderwerp voldoende is besproken, stel dan 'isTopicComplete' in op true.
            - Als 'isTopicComplete' waar is, geef dan een beknopte samenvatting (2-3 zinnen) van de input in het 'summary' veld, en eindig je 'response' met een vraag zoals "Klaar voor het volgende?"
            - Anders, stel 'isTopicComplete' in op false en houd het gesprek gaande.

            Bericht van de gebruiker: "{{{userMessage}}}"
            Gespreksgeschiedenis over dit onderwerp:
            {{{chatHistory}}}
        `,
    });
    
    const onboardingInput: OnboardingInput = { ...input, currentTopic: nextTopic };
    
    const { output } = await onboardingBuddyPrompt(onboardingInput);

    if (!output) throw new Error("Onboarding prompt returned no output.");

    if (output.isTopicComplete && output.summary) {
        saveOnboardingSummary(userRef, userProfile, nextTopic, output.summary).catch(err => {
             console.error("[Onboarding Flow] Background summary save failed:", err);
        });
    }

    return output;
}
