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
        name: 'onboardingBuddyPrompt_v4_natural_transitions',
        model: googleAI.model('gemini-2.5-flash'),
        input: { schema: z.any() },
        output: { schema: OnboardingOutputSchema },
        prompt: `
            Je bent een empathische AI-psycholoog voor een jonge atleet genaamd {{{userName}}}.
            Je doel is om een natuurlijke, ondersteunende conversatie te hebben om de gebruiker te leren kennen.
            Je antwoord ('response') MOET in het Nederlands zijn.

            Het huidige onderwerp is '{{{currentTopic}}}'.
            - Houd het gesprek luchtig en informeel. Stel open vragen. Vraag NIET direct naar de combinatie met sport, tenzij de speler er zelf over begint.
            - Je primaire doel is een korte kennismaking. Als de gebruiker een kort antwoord geeft, is dat voldoende.
            - Bepaal ZELF wanneer een onderwerp is afgerond. Dit is meestal na 1 of 2 antwoorden van de gebruiker. 
            - Als je bepaalt dat het onderwerp is afgerond, stel dan 'isTopicComplete' in op true.
            - BELANGRIJK: Als 'isTopicComplete' waar is, maak dan een VLOEIENDE overgang door in je 'response' een open vraag te stellen over het VOLGENDE onderwerp. ZEG NIET "Laten we verdergaan met een ander onderwerp". Geef een beknopte samenvatting (1-2 zinnen) in het 'summary' veld.
            - Anders, als je denkt dat een korte vervolgvraag nodig is, stel 'isTopicComplete' in op false en houd het gesprek gaande.

            Bericht van de gebruiker: "{{{userMessage}}}"
            Gespreksgeschiedenis over dit onderwerp (kort houden):
            {{{chatHistory}}}
        `,
    });
    
    const onboardingInput: OnboardingInput = { ...input, currentTopic: nextTopic };
    
    const { output } = await onboardingBuddyPrompt(onboardingInput);

    if (!output) throw new Error("Onboarding prompt returned no output.");

    const isLastTopic = nextTopic === 'additionalHobbies' && output.isTopicComplete;

    // Fire-and-forget save operation, unless it's the last topic.
    // The main chat action will handle saving the final summary to ensure atomicity.
    if (output.isTopicComplete && output.summary && !isLastTopic) {
        saveOnboardingSummary(userRef, userProfile, nextTopic, output.summary).catch(err => {
             console.error("[Onboarding Flow] Background summary save failed:", err);
        });
    }

    return { ...output, isLastTopic, lastTopic: nextTopic };
}
