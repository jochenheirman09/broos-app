"use client";
import { useFirestore } from "@/firebase";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import {
  collection,
  deleteDoc,
  doc,
  setDoc,
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
  if (!clubId) throw new Error("Club ID is required to create a team.");
  if (!teamName) throw new Error("Team name is required.");
  if (!db) throw new Error("Firestore is not available");

  const teamCollectionRef = collection(db, "clubs", clubId, "teams");
  const newTeamRef = doc(teamCollectionRef);
  const teamData = {
    id: newTeamRef.id,
    name: teamName,
    clubId: clubId,
  };

  return setDoc(newTeamRef, teamData).catch(() => {
    const permissionError = new FirestorePermissionError({
      path: newTeamRef.path,
      operation: "create",
      requestResourceData: teamData,
    });
    errorEmitter.emit("permission-error", permissionError);
    throw permissionError;
  });
}

export async function generateTeamInvitationCode(
  db: ReturnType<typeof useFirestore>,
  clubId: string,
  teamId: string
) {
  if (!clubId || !teamId) throw new Error("Club ID and Team ID are required.");
  if (!db) throw new Error("Firestore is not available");

  const invitationCode = generateCode();
  const teamRef = doc(db, "clubs", clubId, "teams", teamId);
  const updateData = { invitationCode };

  return updateDoc(teamRef, updateData).catch(() => {
    const permissionError = new FirestorePermissionError({
      path: teamRef.path,
      operation: "update",
      requestResourceData: updateData,
    });
    errorEmitter.emit("permission-error", permissionError);
    throw permissionError;
  });
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
  if (!clubId || !teamId) throw new Error("Club ID and Team ID are required.");
  if (!newName) throw new Error("New team name is required.");
  if (!db) throw new Error("Firestore is not available");

  const teamRef = doc(db, "clubs", clubId, "teams", teamId);
  const updateData = { name: newName };

  return updateDoc(teamRef, updateData).catch(() => {
    const permissionError = new FirestorePermissionError({
      path: teamRef.path,
      operation: "update",
      requestResourceData: updateData,
    });
    errorEmitter.emit("permission-error", permissionError);
    throw permissionError;
  });
}

interface DeleteTeamParams {
  db: ReturnType<typeof useFirestore>;
  clubId: string;
  teamId: string;
}

export async function deleteTeam({ db, clubId, teamId }: DeleteTeamParams) {
  if (!clubId || !teamId) throw new Error("Club ID and Team ID are required.");
  if (!db) throw new Error("Firestore is not available");

  const teamRef = doc(db, "clubs", clubId, "teams", teamId);

  return deleteDoc(teamRef).catch(() => {
    const permissionError = new FirestorePermissionError({
      path: teamRef.path,
      operation: "delete",
    });
    errorEmitter.emit("permission-error", permissionError);
    throw permissionError;
  });
}
