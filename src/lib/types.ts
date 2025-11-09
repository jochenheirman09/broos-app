export type UserRole = "player" | "staff" | "responsible";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  emailVerified: boolean;
  clubId?: string;
  teamId?: string;
  birthDate?: string;
  photoURL?: string;
}

export interface Club {
  id: string;
  name:string;
  ownerId: string;
}

export interface Team {
  id: string;
  name: string;
  clubId: string;
  invitationCode?: string;
}

export interface WellnessScore {
  id?: string;
  date: string; // YYYY-MM-DD
  mood?: number;
  stress?: number;
  sleep?: number;
  motivation?: number;
  rest?: number;
  familyLife?: number;
  school?: number;
  hobbys?: number;
  food?: number;
  injury?: boolean;
  freeText?: string;
  shareWithStaff?: boolean;
  summary?: string; // AI generated summary for the day
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
