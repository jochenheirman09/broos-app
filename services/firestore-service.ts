
'use server';

import { getFirebaseAdmin } from '@/ai/genkit';
import { type DocumentReference, serverTimestamp } from 'firebase-admin/firestore';
import type { OnboardingTopic, UserProfile, FullWellnessAnalysisOutput } from '@/lib/types';


export async function saveOnboardingSummary(
    userRef: DocumentReference,
    userProfile: UserProfile,
    topic: OnboardingTopic,
    summary: string,
) {
    const updateData = {
        [topic]: summary,
    };

    const isLastTopic = topic === 'additionalHobbies';
    if (isLastTopic) {
        (updateData as UserProfile).onboardingCompleted = true;
    }

    try {
        await userRef.update(updateData);
        console.log(`[Firestore Service] Onboarding summary for topic '${topic}' saved for user ${userRef.id}.`);
        if (isLastTopic) {
            console.log(`[Firestore Service] Onboarding marked as complete for user ${userRef.id}.`);
        }
    } catch (e: any) {
        console.error(`Error updating onboarding summary for user ${userRef.id} and topic ${topic}:`, e);
    }
}
