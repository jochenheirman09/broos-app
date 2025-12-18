
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
  personalDetails?: string; 
  acceptedTerms?: boolean;
  schedule?: Schedule;
  siblings?: { name: string; age?: number }[];
  pets?: { name: string; type: string }[];
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
  logoURL?: string;
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
  todayActivity?: ScheduleActivity | 'individual'; // The main activity for this day
  mood?: number;
  moodReason?: string;
  stress?: number;
  stressReason?: string;
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
  // DEPRECATED: These fields are kept for backwards compatibility with old data, but are no longer actively set.
  sleep?: number;
  sleepReason?: string;
}

export interface Game {
    id: string; // YYYY-MM-DD
    userId: string;
    date: string;
    opponent?: string;
    score?: string;
    playerSummary?: string;
    playerRating?: number; // 1-10
    createdAt: any; // Firestore ServerTimestamp
    updatedAt: any; // Firestore ServerTimestamp
}

export interface Chat {
  id: string; // YYYY-MM-DD
  userId: string;
  summary: string;
  date: string;
  updatedAt: any; // Firestore ServerTimestamp
}

export interface ChatMessage {
  id?: string; // Optional on write, will be present on read
  role: 'user' | 'assistant';
  content: string;
  timestamp: any; // Firestore ServerTimestamp on write, Timestamp object on read
  sortOrder?: number; // Client-side timestamp for reliable ordering
}

export interface Conversation {
    id: string;
    participants: string[];
    isGroupChat: boolean;
    name?: string;
    participantProfiles?: { [key: string]: { name: string; photoURL?: string } };
    lastMessage: string;
    lastMessageTimestamp: any;
}

export interface MyChat extends Conversation {
    // This is the denormalized document stored in /users/{userId}/myChats.
    // It's a direct copy of the Conversation document for easy and secure querying.
}

export interface P2PChatMessage {
    id?: string;
    senderId: string;
    content: string;
    timestamp: any; // Firestore ServerTimestamp
}

export type WithId<T> = T & { id: string };

export interface Alert {
  id: string;
  userId: string;
  clubId: string; // Denormalized for security rules
  teamId: string; // Denormalized for security rules
  date: string; // YYYY-MM-DD
  topic: string; // The topic of conversation when the alert was triggered
  alertType: 'Mental Health' | 'Aggression' | 'Substance Abuse' | 'Extreme Negativity';
  triggeringMessage: string;
  status: 'new' | 'acknowledged' | 'resolved';
  shareWithStaff?: boolean; 
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

// Client-safe types
export type OnboardingTopic = "familySituation" | "schoolSituation" | "personalGoals" | "matchPreparation" | "recoveryHabits" | "additionalHobbies";

export interface WellnessAnalysisInput {
    buddyName: string;
    userName: string;
    userMessage: string;
    chatHistory?: string;
    retrievedDocs?: any;
    todayActivity?: string;
    currentTime?: string;
    // Add all structured memory fields for context
    familySituation?: string;
    schoolSituation?: string;
    personalGoals?: string;
    matchPreparation?: string;
    recoveryHabits?: string;
    additionalHobbies?: string;
    personalDetails?: string;
    // Game day context
    isGameDay?: boolean;
    game?: Partial<Game>;
}

export interface FullWellnessAnalysisOutput {
  response: string;
  summary?: string;
  wellnessScores?: Partial<Omit<WellnessScore, "id" | "date" | "updatedAt" | "sleep" | "sleepReason">>;
  alert?: {
    topic: string;
    alertType: 'Mental Health' | 'Aggression' | 'Substance Abuse' | 'Extreme Negativity';
    triggeringMessage: string;
    shareWithStaff?: boolean; 
  };
  askForConsent?: boolean;
  updatedFields?: Partial<Pick<UserProfile, 'familySituation' | 'schoolSituation' | 'personalGoals' | 'matchPreparation' | 'recoveryHabits' | 'additionalHobbies' | 'personalDetails'>>;
  gameUpdate?: Partial<Omit<Game, 'id' | 'userId' | 'date' | 'createdAt' | 'updatedAt'>>;
}


export interface OnboardingInput extends WellnessAnalysisInput {
    currentTopic: OnboardingTopic;
}

export interface OnboardingOutput {
  response: string;
  isTopicComplete: boolean;
  summary?: string;
  isLastTopic?: boolean;
  lastTopic?: OnboardingTopic;
  siblings?: { name: string; age?: number }[];
  pets?: { name: string; type: string }[];
}

export interface NotificationInput {
  userId: string;
  title: string;
  body: string;
  link?: string;
}
