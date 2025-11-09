import type { User as FirebaseUser } from "firebase/auth";

export type UserRole = "player" | "staff" | "responsible";

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  clubId?: string;
}

export interface Club {
  id: string;
  name:string;
  ownerId: string;
}
