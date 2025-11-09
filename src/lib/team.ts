"use client";
import {
  getFirestore,
  addDoc,
  collection,
  doc,
  updateDoc,
} from "firebase/firestore";
import { getApp, getApps, initializeApp } from "firebase/app";
import { firebaseConfig } from "@/lib/firebase";

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

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
  clubId: string;
  teamName: string;
}

export async function createTeam({ clubId, teamName }: CreateTeamParams) {
  if (!clubId) {
    throw new Error("Club ID is required to create a team.");
  }
  if (!teamName) {
    throw new Error("Team name is required.");
  }

  const teamRef = await addDoc(collection(db, "clubs", clubId, "teams"), {
    name: teamName,
    clubId: clubId,
  });

  // add the id to the document
  await updateDoc(teamRef, {
    id: teamRef.id,
  });
}

export async function generateTeamInvitationCode(
  clubId: string,
  teamId: string
) {
  if (!clubId || !teamId) {
    throw new Error("Club ID and Team ID are required.");
  }

  const invitationCode = generateCode();
  const teamRef = doc(db, "clubs", clubId, "teams", teamId);

  await updateDoc(teamRef, {
    invitationCode: invitationCode,
  });

  return invitationCode;
}
