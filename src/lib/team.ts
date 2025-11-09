"use client";
import { useFirestore } from "@/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";

// Function to generate a random 6-character alphanumeric code
const generateCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

interface CreateTeamParams {
  db: ReturnType<typeof useFirestore>;
  clubId: string;
  teamName: string;
}

export async function createTeam({ db, clubId, teamName }: CreateTeamParams) {
  if (!clubId) {
    throw new Error("Club ID is required to create a team.");
  }
  if (!teamName) {
    throw new Error("Team name is required.");
  }
  if (!db) {
    throw new Error("Firestore is not available");
  }

  const teamCollectionRef = collection(db, "clubs", clubId, "teams");
  const teamRef = doc(teamCollectionRef);

  await updateDoc(teamRef, {
    id: teamRef.id,
    name: teamName,
    clubId: clubId,
  });

  return teamRef.id;
}

export async function generateTeamInvitationCode(
  db: ReturnType<typeof useFirestore>,
  clubId: string,
  teamId: string
) {
  if (!clubId || !teamId) {
    throw new Error("Club ID and Team ID are required.");
  }
  if (!db) {
    throw new Error("Firestore is not available");
  }

  const invitationCode = generateCode();
  const teamRef = doc(db, "clubs", clubId, "teams", teamId);

  await updateDoc(teamRef, {
    invitationCode: invitationCode,
  });

  return invitationCode;
}

interface UpdateTeamParams {
  db: ReturnType<typeof useFirestore>;
  clubId: string;
  teamId: string;
  newName: string;
}

export async function updateTeam({
  db,
  clubId,
  teamId,
  newName,
}: UpdateTeamParams) {
  if (!clubId || !teamId) {
    throw new Error("Club ID and Team ID are required.");
  }
  if (!newName) {
    throw new Error("New team name is required.");
  }
  if (!db) {
    throw new Error("Firestore is not available");
  }

  const teamRef = doc(db, "clubs", clubId, "teams", teamId);
  await updateDoc(teamRef, {
    name: newName,
  });
}

interface DeleteTeamParams {
  db: ReturnType<typeof useFirestore>;
  clubId: string;
  teamId: string;
}

export async function deleteTeam({ db, clubId, teamId }: DeleteTeamParams) {
  if (!clubId || !teamId) {
    throw new Error("Club ID and Team ID are required.");
  }
  if (!db) {
    throw new Error("Firestore is not available");
  }

  const teamRef = doc(db, "clubs", clubId, "teams", teamId);
  await deleteDoc(teamRef);
}
