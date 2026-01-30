
"use server";

import { getFirebaseAdmin } from "@/ai/genkit";
import type { SportProfile } from "@/lib/types";

// Security check helper (can be expanded)
async function verifyIsSuperAdmin(userId: string) {
    const { adminAuth } = await getFirebaseAdmin();
    const user = await adminAuth.getUser(userId);
    const superAdminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "").split(',');
    if (!user.email || !superAdminEmails.includes(user.email)) {
        throw new Error("Permission Denied: User is not a super admin.");
    }
}

interface SportProfileData {
    name: string;
    slogan: string;
}

export async function createSportProfile(userId: string, id: string, data: SportProfileData): Promise<{ success: boolean; message: string }> {
    try {
        await verifyIsSuperAdmin(userId);
        const { adminDb } = await getFirebaseAdmin();
        const docRef = adminDb.collection("sport_profiles").doc(id);
        const doc = await docRef.get();
        if (doc.exists) {
            return { success: false, message: `Een sportprofiel met ID '${id}' bestaat al.`};
        }
        await docRef.set({ ...data, id });
        return { success: true, message: "Sportprofiel succesvol aangemaakt." };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function updateSportProfile(userId: string, id: string, data: SportProfileData): Promise<{ success: boolean; message: string }> {
    try {
        await verifyIsSuperAdmin(userId);
        const { adminDb } = await getFirebaseAdmin();
        await adminDb.collection("sport_profiles").doc(id).update(data);
        return { success: true, message: "Sportprofiel succesvol bijgewerkt." };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function deleteSportProfile(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    try {
        await verifyIsSuperAdmin(userId);
        const { adminDb } = await getFirebaseAdmin();
        await adminDb.collection("sport_profiles").doc(id).delete();
        return { success: true, message: "Sportprofiel succesvol verwijderd." };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}
