

export type UserRole = "player" | "staff" | "responsible";
export type Gender = "male" | "female";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerified: boolean;
  clubId?: string;
  teamId?: string;
  birthDate?: string;
  gender?: Gender;
  photoURL?: string;
  buddyName?: string;
  buddyAvatar?: string;
  onboardingCompleted?: boolean;
  familySituation?: string;
  schoolSituation?: string;
  personalGoals?: string;
  matchPreparation?: string;
  recoveryHabits?: string;
  additionalHobbies?: string;
  acceptedTerms?: boolean;
}

export interface FcmToken {
    token: string;
    createdAt: any; // Firestore ServerTimestamp
}

export interface Club {
  id: string;
  name:string;
  ownerId: string;
  invitationCode?: string;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type ScheduleActivity = 'training' | 'game' | 'rest';

export interface Schedule {
    [key: string]: ScheduleActivity;
}

export interface Team {
  id: string;
  name: string;
  clubId: string;
  invitationCode?: string;
  schedule?: Schedule;
}

export interface WellnessScore {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  mood?: number;
  moodReason?: string;
  stress?: number;
  stressReason?: string;
  sleep?: number;
  sleepReason?: string;
  motivation?: number;
  motivationReason?: string;
  rest?: number;
  restReason?: string;
  familyLife?: number;
  familyLifeReason?: string;
  school?: number;
  schoolReason?: string;
  hobbys?: number;
  hobbysReason?: string;
  food?: number;
  foodReason?: string;
  injury?: boolean;
  injuryReason?: string;
  freeText?: string;
  shareWithStaff?: boolean;
  summary?: string; // AI generated summary for the day
  updatedAt?: any; // Firestore ServerTimestamp
}

export interface Chat {
  id: string; // YYYY-MM-DD
  userId: string;
  summary: string;
  date: string;
  updatedAt: any; // Firestore ServerTimestamp
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: any; // Firestore ServerTimestamp
}

export type WithId<T> = T & { id: string };

export interface Alert {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  alertType: 'Mental Health' | 'Aggression' | 'Substance Abuse' | 'Extreme Negativity';
  triggeringMessage: string;
  status: 'new' | 'acknowledged' | 'resolved';
  createdAt: any; // Firestore ServerTimestamp
}

export interface PlayerUpdate {
  id: string;
  title: string;
  content: string;
  category: 'Sleep' | 'Nutrition' | 'Motivation' | 'Stress' | 'Wellness';
  date: string; // YYYY-MM-DD
}

export interface StaffUpdate {
  id: string;
  title: string;
  content: string;
  category: 'Team Performance' | 'Player Wellness' | 'Injury Risk';
  date: string;
}

export interface ClubUpdate {
    id: string;
    title: string;
    content: string;
    category: 'Club Trends' | 'Team Comparison' | 'Resource Suggestion';
    date: string;
}


export interface TeamSummary {
    id: string; // e.g., 'weekly-2024-20'
    teamId: string;
    date: string;
    averageMood?: number;
    averageStress?: number;
    averageSleep?: number;
    averageMotivation?: number;
    injuryCount?: number;
    commonTopics?: string[];
}

export interface PlayerTraining {
    id: string;
    userId: string;
    date: string; // YYYY-MM-DD
    description: string;
    createdAt: any; // Firestore ServerTimestamp
}

export interface KnowledgeDocument {
    id: string;
    name: string;
    // firestorePath: string; // Path to the document in Firestore knowledge_base collection
    content: string;
    embedding: number[];
    status: 'pending' | 'ingesting' | 'completed' | 'error';
    ingestedAt?: any; // Firestore ServerTimestamp
}

export interface KnowledgeUsageStat {
    id: string; // Corresponds to KnowledgeDocument ID
    queryCount: number;
    lastQueried: any; // Firestore ServerTimestamp
}
