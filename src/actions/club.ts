"use server";

import { firebaseConfig } from "@/lib/firebase";
import { getApps, initializeApp, getApp } from "firebase/app";
import { getFirestore, addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

const ClubSchema = z.object({
  name: z.string().min(3, "Club name must be at least 3 characters long."),
});

type State = {
  error?: string;
};

export async function createClub(prevState: State, formData: FormData): Promise<State> {
  const userId = formData.get("userId");
  if (!userId) {
    return { error: "You must be logged in to create a club." };
  }

  const validatedFields = ClubSchema.safeParse({
    name: formData.get("name"),
  });

  if (!validatedFields.success) {
    return {
      error: "Invalid club name.",
    };
  }

  const { name } = validatedFields.data;

  try {
    const clubRef = await addDoc(collection(db, "clubs"), {
      name,
      ownerId: userId,
    });

    const userRef = doc(db, "users", userId as string);
    await updateDoc(userRef, {
      clubId: clubRef.id,
    });
  } catch (error) {
    return {
      error: "Failed to create club.",
    };
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
