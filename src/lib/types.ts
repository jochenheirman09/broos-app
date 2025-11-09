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
