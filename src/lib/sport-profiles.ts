
// Central configuration for different sports.
// This data is now managed in the Firestore 'sport_profiles' collection
// and can be edited by a super-admin in the /admin/sport-profiles page.
import type { SportProfile as SportProfileType } from './types';

// This type is now defined in src/lib/types.ts and data is fetched from Firestore
export type SportProfile = SportProfileType;

// The default profile is kept as a fallback for clubs without a sport defined.
export const defaultSportProfile: SportProfile = {
    id: 'football',
    name: 'Voetbal',
    slogan: 'Passie, strijd en teamgeest.',
};
