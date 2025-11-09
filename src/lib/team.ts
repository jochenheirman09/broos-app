"use client";
import {
  getFirestore,
  addDoc,
  collection,
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
  generateCode: boolean;
}

export async function createTeam({
  clubId,
  teamName,
  generateCode: shouldGenerateCode,
}: CreateTeamParams) {
  if (!clubId) {
    throw new Error("Club ID is required to create a team.");
  }
  if (!teamName) {
    throw new Error("Team name is required.");
  }

  const teamData: {
    name: string;
    clubId: string;
    invitationCode?: string;
  } = {
    name: teamName,
    clubId: clubId,
  };

  if (shouldGenerateCode) {
    teamData.invitationCode = generateCode();
  }

  await addDoc(collection(db, "clubs", clubId, "teams"), teamData);
}
