
'use server';
import { z } from 'zod';
import type { DocumentReference } from 'firebase-admin/firestore';
import { saveOnboardingSummary } from '@/services/firestore-service';
import type { UserProfile, WellnessAnalysisInput, OnboardingInput, OnboardingOutput, OnboardingTopic } from '@/lib/types';
import { getAiInstance } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

// DEFINE PROMPT AND AI INSTANCE AT MODULE LEVEL
const aiPromise = getAiInstance();

const OnboardingOutputSchema = z.object({
    response: z.string().describe("Het antwoord van de AI-buddy."),
    isTopicComplete: z.boolean().describe("True als het onderwerp voldoende is besproken."),
    summary: z.string().optional().describe("Een beknopte samenvatting (1-2 zinnen) van de input van de gebruiker, alleen als isTopicComplete waar is."),
});

const OnboardingPromptInputSchema = z.object({
  userMessage: z.string(),
  currentTopic: z.string(),
  chatHistory: z.string().optional(),
  currentTime: z.string(),
  today: z.string(),
  dayName: z.string(),
});


const onboardingBuddyPromptPromise = aiPromise.then(ai => ai.definePrompt({
    name: 'onboardingBuddyPrompt_v7_timefix',
    model: googleAI.model('gemini-2.5-flash'),
    input: { schema: OnboardingPromptInputSchema },
    output: { schema: OnboardingOutputSchema },
    prompt: `
        Je bent een empathische AI-psycholoog voor een jonge atleet.
        Je doel is om een natuurlijke, ondersteunende conversatie te hebben om de gebruiker te leren kennen.
        Je antwoord ('response') MOET in het Nederlands zijn.

        HUIDIG ONDERWERP: '{{{currentTopic}}}'.
        CONTEXT: Tijd: {{{currentTime}}}, Dag: {{{dayName}}}, Datum: {{{today}}}.

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
}));


export async function runOnboardingFlow(
    userRef: DocumentReference,
    userProfile: UserProfile,
    input: WellnessAnalysisInput,
    isFirstInteraction: boolean // Receive the flag from the controller
): Promise<OnboardingOutput> {
    
    const onboardingBuddyPrompt = await onboardingBuddyPromptPromise;

    const onboardingTopics: OnboardingTopic[] = [
        "familySituation", "schoolSituation", "personalGoals", 
        "matchPreparation", "recoveryHabits", "additionalHobbies"
    ];
    
    const nextTopic = onboardingTopics.find(topic => !userProfile[topic]);

    if (!nextTopic) {
        console.warn("[Onboarding Flow] Onboarding is already complete, but flow was called.");
        return { response: "Het lijkt erop dat we elkaar al kennen! Waar wil je het vandaag over hebben?", isTopicComplete: true, summary: "Onboarding was al voltooid." };
    }
    
    // Ensure all necessary fields are passed to the prompt
    const onboardingInput: z.infer<typeof OnboardingPromptInputSchema> = {
        userMessage: input.userMessage,
        currentTopic: nextTopic,
        chatHistory: input.chatHistory,
        currentTime: input.currentTime!,
        today: input.today!,
        dayName: input.dayName!,
    };
    
    const { output } = await onboardingBuddyPrompt(onboardingInput);

    if (!output) throw new Error("Onboarding prompt returned no output.");

    const isLastTopic = nextTopic === 'additionalHobbies' && output.isTopicComplete;

    if (output.isTopicComplete && output.summary) {
        // Fire-and-forget the save operation.
        saveOnboardingSummary(userRef, nextTopic, { summary: output.summary }, isLastTopic).catch(err => {
            console.error(`[Onboarding Flow] Background save failed for user ${userRef.id}:`, err);
        });
    }

    let finalResponse = output.response || "";

    // If it's the very first interaction, prepend the welcome message.
    if (isFirstInteraction) {
        const buddyName = userProfile.buddyName || 'Broos';
        const welcomeMessage = `Hallo, aangenaam kennis te maken, ik ben ${buddyName} en zal jou helpen. Wees ervan bewust dat alles wat je tegen mij zegt vertrouwelijk blijft tussen ons en dat we telkens jouw toestemming zullen vragen als we iets willen communiceren met jouw trainers en clubverantwoordelijken. We zullen enkel algemene informatie gebruiken om te communiceren, tenzij je ons toestemming geeft om de details te delen, maar ook dat doen we in de grootste discretie. Weet dat we je ook altijd in contact kunnen brengen met een vertrouwenspersoon indien je dat wilt. We zijn hier samen om jou beter te maken, dus als je enige vragen of tips en advies nodig hebt, laat me zeker weten.`;
        finalResponse = `${welcomeMessage}\n\n${finalResponse}`;
    }

    return { 
      response: finalResponse, 
      isTopicComplete: output.isTopicComplete ?? false,
      isLastTopic, 
      lastTopic: nextTopic 
    };
}
