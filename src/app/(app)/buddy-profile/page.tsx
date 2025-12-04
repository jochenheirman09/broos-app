
"use client";

import { BuddyProfileCustomizer as BuddyProfileCustomizerComponent } from "@/components/app/buddy-profile/page";
import { useRouter } from "next/navigation";

// This page now acts as a fallback or a direct access point
// to the customizer component.
export default function BuddyProfileCustomizerPage() {
    const router = useRouter();
    return <BuddyProfileCustomizerComponent onSave={() => router.push('/dashboard')} />;
}
