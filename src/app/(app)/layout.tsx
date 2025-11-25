
"use client";

import { useUser } from "@/context/user-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { AppHeader } from "@/components/app/header";
import { Spinner } from "@/components/ui/spinner";
import { PlayerLayout } from "@/components/app/player-layout";
import { useFirestore } from "@/firebase";
import { updateUserProfile } from "@/lib/firebase/firestore/user";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const db = useFirestore();

  const isProfileIncomplete =
    userProfile &&
    ((userProfile.role === "player" &&
      (!userProfile.teamId || !userProfile.birthDate)) ||
      (userProfile.role === "staff" && !userProfile.teamId));
      
  const isResponsibleWithClub = userProfile?.role === "responsible" && userProfile?.clubId;


  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }
    if (!user.emailVerified) {
      router.replace("/verify-email");
      return;
    }

    // Just-in-time sync for email verification status
    if (user.emailVerified && userProfile && !userProfile.emailVerified) {
      updateUserProfile({
        db,
        userId: user.uid,
        data: { emailVerified: true },
      });
    }

    if (isProfileIncomplete) {
      if (pathname !== "/complete-profile") {
        router.replace("/complete-profile");
      }
    } else if (pathname === "/complete-profile") {
      router.replace("/dashboard");
    }

    // Redirect responsible user away from create-club if they already have one
    if(isResponsibleWithClub && pathname === "/create-club") {
        router.replace("/dashboard");
    }

  }, [user, userProfile, loading, router, isProfileIncomplete, isResponsibleWithClub, pathname, db]);

  if (loading || !user || !user.emailVerified) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }

  // If profile is incomplete, only render the children if we are on the complete profile page.
  // Otherwise, show a spinner while we redirect.
  if (isProfileIncomplete && pathname !== "/complete-profile") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }

  if (userProfile?.role === "player") {
    return <PlayerLayout>{children}</PlayerLayout>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {!isProfileIncomplete && <AppHeader />}
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
