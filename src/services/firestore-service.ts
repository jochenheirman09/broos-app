'use server';

import { getFirebaseAdmin } from '@/ai/genkit';
import { type DocumentReference } from 'firebase-admin/firestore';
import type { OnboardingTopic, UserProfile } from '@/lib/types';


export async function saveOnboardingSummary(
    userRef: DocumentReference,
    userProfile: UserProfile,
    topic: OnboardingTopic,
    summary: string,
) {
    const updateData: Partial<UserProfile> = {
        [topic]: summary,
    };

    const onboardingTopics: OnboardingTopic[] = [
        "familySituation", "schoolSituation", "personalGoals",
        "matchPreparation", "recoveryHabits", "additionalHobbies"
    ];
    
    // Determine which topics are already completed
    const completedTopics = onboardingTopics.filter(t => !!userProfile[t] || t === topic);

    // If all topics are now completed, mark onboarding as complete
    if (completedTopics.length === onboardingTopics.length) {
        updateData.onboardingCompleted = true;
    }

    try {
        await userRef.update(updateData);
        console.log(`[Firestore Service] Onboarding summary for topic '${topic}' saved for user ${userRef.id}.`);
        if (updateData.onboardingCompleted) {
            console.log(`[Firestore Service] Onboarding marked as complete for user ${userRef.id}.`);
        }
    } catch (e: any) {
        console.error(`Error updating onboarding summary for user ${userRef.id} and topic ${topic}:`, e);
    }
}
