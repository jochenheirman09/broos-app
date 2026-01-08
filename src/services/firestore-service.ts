
'use server';
import { getFirebaseAdmin, getAiInstance } from '../ai/genkit';
import { FieldValue, type DocumentReference } from 'firebase-admin/firestore';
import type { OnboardingTopic, UserProfile, Game, WellnessScore, FullWellnessAnalysisOutput } from '../lib/types';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';
import { createHash } from 'crypto';

export async function saveOnboardingSummary(
    userRef: DocumentReference,
    topic: OnboardingTopic,
    data: { summary?: string, siblings?: any[], pets?: any[] },
    isLastTopic: boolean
) {
    const updateData: { [key: string]: any } = {};

    if (data.summary) {
        updateData[topic] = data.summary;
    }
    if (data.siblings && data.siblings.length > 0) {
        updateData.siblings = FieldValue.arrayUnion(...data.siblings);
    }
    if (data.pets && data.pets.length > 0) {
        updateData.pets = FieldValue.arrayUnion(...data.pets);
    }

    if (isLastTopic) {
        updateData.onboardingCompleted = true;
    }
    
    if (Object.keys(updateData).length === 0) return;

    try {
        await userRef.set(updateData, { merge: true });
        console.log(`[Firestore Service] Onboarding data for topic '${topic}' saved for user ${userRef.id}.`);
    } catch (e: any) {
        console.error(`Error updating onboarding data for user ${userRef.id} and topic ${topic}:`, e);
    }
}

export async function saveUserMessage(userId: string, today: string, userMessage: string) {
    console.log(`[Firestore Service] Saving user message for ${userId}.`);
    const { adminDb } = await getFirebaseAdmin();
    const messagesColRef = adminDb.collection('users').doc(userId).collection('chats').doc(today).collection('messages');
    const clientTimestampMs = Date.now();
    
    const newMessageRef = messagesColRef.doc(`msg_${clientTimestampMs}_user`);
    
    await newMessageRef.set({
        role: 'user',
        content: userMessage,
        timestamp: FieldValue.serverTimestamp(),
        sortOrder: clientTimestampMs,
    });
}

export async function saveAssistantResponse(userId: string, today: string, assistantResponse: string) {
  console.log(`[Firestore Service] Saving assistant response for ${userId}.`);
  const { adminDb } = await getFirebaseAdmin();
  const messagesColRef = adminDb.collection('users').doc(userId).collection('chats').doc(today).collection('messages');
  const clientTimestampMs = Date.now() + 1;
  
  const newMessageRef = messagesColRef.doc(`msg_${clientTimestampMs}_assistant`);

  await newMessageRef.set({
      role: 'assistant',
      content: assistantResponse,
      timestamp: FieldValue.serverTimestamp(),
      sortOrder: clientTimestampMs,
  });
}


/**
 * A dedicated server action that takes the full chat history of the day and
 * performs a comprehensive analysis to extract all structured data (scores, alerts, etc.).
 * It then saves all extracted data to Firestore in a single transaction to ensure idempotency.
 * This is a 'fire-and-forget' function from the client's perspective.
 */
export async function analyzeAndSaveChatData(userId: string, fullChatHistory: string) {
    console.log(`[Analysis Service] Starting full analysis for user ${userId}.`);
    const ai = await getAiInstance();

    // Define the Zod schema for the expected output of the analysis prompt.
    const AnalysisOutputSchema = z.object({
      summary: z.string().optional().describe("Een beknopte, algehele samenvatting van het gesprek."),
      wellnessScores: z.object({
          mood: z.number().min(1).max(5).optional(),
          moodReason: z.string().optional(),
          stress: z.number().min(1).max(5).optional().describe("HOGE score = WEINIG stress."),
          stressReason: z.string().optional(),
          rest: z.number().min(1).max(5).optional(),
          restReason: z.string().optional(),
          motivation: z.number().min(1).max(5).optional(),
          motivationReason: z.string().optional(),
          familyLife: z.number().min(1).max(5).optional(),
          familyLifeReason: z.string().optional(),
          school: z.number().min(1).max(5).optional(),
          schoolReason: z.string().optional(),
          hobbys: z.number().min(1).max(5).optional(),
          hobbysReason: z.string().optional(),
          food: z.number().min(1).max(5).optional(),
          foodReason: z.string().optional(),
      }).optional(),
      alert: z.object({
          topic: z.string().describe("Het onderwerp van gesprek waar de alert over ging, bv. 'School', 'Training', 'Familie'."),
          alertType: z.enum(['Mental Health', 'Aggression', 'Substance Abuse', 'Extreme Negativity', 'Request for Contact']),
          triggeringMessage: z.string().describe("De exacte boodschap van de gebruiker die de alert veroorzaakte."),
          shareWithStaff: z.boolean().optional(),
      }).optional(),
      gameUpdate: z.object({
          opponent: z.string().optional(),
          score: z.string().optional(),
          playerSummary: z.string().optional(),
          playerRating: z.number().min(1).max(10).optional(),
      }).optional(),
    });

    const analysisPrompt = ai.definePrompt({
        name: 'chatDataExtractorPrompt_v6_final',
        model: googleAI.model('gemini-2.5-flash'),
        input: { schema: z.object({ chatHistory: z.string() }) },
        output: { schema: AnalysisOutputSchema },
        prompt: `
            Je bent een data-analist. Analyseer het volgende gesprek en extraheer de data.
            - **Samenvatting:** Geef een korte samenvatting van het hele gesprek.
            - **Welzijnsscores:** Leid scores (1-5) en redenen af voor de 8 welzijnsthema's. VRAAG NOOIT OM EEN SCORE. Een hoog stress-cijfer betekent WEINIG stress.
            - **Alerts (STRIKT):** Genereer ALLEEN een alert bij DUIDELIJKE rode vlaggen. Een slechte dag of "het ging niet goed" is GEEN alert.
                - **Contactverzoek:** Als de speler expliciet vraagt om met een vertrouwenspersoon te praten (bv. "ja, ik wil praten"), creëer een 'Request for Contact' alert. De 'triggeringMessage' MOET de letterlijke vraag van de speler zijn. Zet 'shareWithStaff' op 'true'.
                - **Andere Alerts:** Zoek naar expliciete vermeldingen van:
                    - Mentale problemen (bv. "ik zie het niet meer zitten", "voel me waardeloos"). AlertType: 'Mental Health'. De 'triggeringMessage' is de zin van de speler.
                    - Agressie (bv. "ik werd zo boos dat ik iets kapot heb gemaakt"). AlertType: 'Aggression'. De 'triggeringMessage' is de zin van de speler.
                    - Middelengebruik (bv. "ik heb gedronken voor de wedstrijd"). AlertType: 'Substance Abuse'. De 'triggeringMessage' is de zin van de speler.
                - **Toestemming:** Als de speler "ja" antwoordt op de vraag om details te delen, zet dan 'shareWithStaff' op 'true' voor de desbetreffende alert.
            - **Wedstrijd:** Als er over een wedstrijd is gesproken, vul het 'gameUpdate' object.

            Gespreksgeschiedenis:
            {{{chatHistory}}}
        `,
    });

    try {
        const { output } = await analysisPrompt({ chatHistory: fullChatHistory });

        if (!output) {
            console.warn(`[Analysis Service] AI data extraction returned null for user ${userId}.`);
            return;
        }

        const { adminDb } = await getFirebaseAdmin();
        const today = new Date().toISOString().split('T')[0];
        
        await adminDb.runTransaction(async (transaction) => {
            const userDocRef = adminDb.collection('users').doc(userId);
            
            // --- Idempotency Check & Write ---
            // We use the wellness document as the primary flag for idempotency.
            const wellnessDocRef = userDocRef.collection('wellnessScores').doc(today);
            const wellnessDoc = await transaction.get(wellnessDocRef);
            
            if (wellnessDoc.exists) {
                console.log(`[Analysis Service] Transaction Aborted: Data for user ${userId} on ${today} already analyzed.`);
                return; // Abort if data already exists for today.
            }

            // --- Proceed with all writes within the transaction ---

            if (output.summary) {
                const chatDocRef = userDocRef.collection('chats').doc(today);
                transaction.set(chatDocRef, { summary: output.summary, date: today, userId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
            }
            if (output.wellnessScores && Object.keys(output.wellnessScores).length > 0) {
                transaction.set(wellnessDocRef, { ...output.wellnessScores, date: today, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
            }
            if (output.gameUpdate && Object.keys(output.gameUpdate).length > 0) {
                const gameDocRef = userDocRef.collection('games').doc(today);
                transaction.set(gameDocRef, { ...output.gameUpdate, date: today, userId, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
            }
            if (output.alert) {
                const userDoc = await transaction.get(userDocRef); // Re-get user doc inside transaction for consistency
                const userData = userDoc.data() as UserProfile | undefined;
                if (userData?.clubId && userData?.teamId) {
                    
                    // Create a unique hash for the alert to prevent duplicates of the exact same message on the same day.
                    const alertHash = createHash('md5').update(userId + today + output.alert.triggeringMessage).digest('hex');
                    const alertDocRef = adminDb.collection('clubs').doc(userData.clubId).collection('teams').doc(userData.teamId).collection('alerts').doc(alertHash);

                    const isRequestForContact = output.alert.alertType === 'Request for Contact';
                    const shareWithStaff = isRequestForContact ? false : (output.alert.shareWithStaff ?? false);

                    // Set the alert data, which will only happen if the document doesn't exist (part of the transaction's purpose)
                    transaction.set(alertDocRef, {
                        ...output.alert,
                        id: alertDocRef.id,
                        userId, 
                        clubId: userData.clubId, 
                        teamId: userData.teamId,
                        date: today, 
                        status: 'new',
                        notificationStatus: 'pending',
                        shareWithStaff: shareWithStaff,
                        createdAt: FieldValue.serverTimestamp(),
                    });
                }
            }
        });

        console.log(`[Analysis Service] Successfully analyzed and saved data for user ${userId}.`);

    } catch (error) {
        console.error(`[Analysis Service] CRITICAL: Failed to analyze and save data for user ${userId}:`, error);
    }
}

    