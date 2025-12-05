
'use server';

import type { DocumentReference } from 'firebase-admin/firestore';
import type { OnboardingTopic, UserProfile } from '@/lib/types';


export async function saveOnboardingSummary(
    userRef: DocumentReference,
    userProfile: UserProfile,
    topic: OnboardingTopic,
    data: {
        summary?: string;
        siblings?: { name: string; age?: number }[];
        pets?: { name: string; type: string }[];
    }
): Promise<void> {
    const updateData: Partial<UserProfile> = {};

    if (data.summary) {
        updateData[topic] = data.summary;
    }
    if (data.siblings && data.siblings.length > 0) {
        updateData.siblings = data.siblings;
    }
    if (data.pets && data.pets.length > 0) {
        updateData.pets = data.pets;
    }


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

    if (Object.keys(updateData).length === 0) {
        console.log(`[Firestore Service] No new data to save for topic '${topic}' for user ${userRef.id}.`);
        return;
    }


    try {
        await userRef.update(updateData);
        console.log(`[Firestore Service] Onboarding data for topic '${topic}' saved for user ${userRef.id}.`);
        if (updateData.onboardingCompleted) {
            console.log(`[Firestore Service] Onboarding marked as complete for user ${userRef.id}.`);
        }
    } catch (e: any) {
        console.error(`Error updating onboarding data for user ${userRef.id} and topic ${topic}:`, e);
        // Propagate the error
        throw e;
    }
}
