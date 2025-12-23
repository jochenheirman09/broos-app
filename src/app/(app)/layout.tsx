"use client";

import { useUser } from "@/context/user-context";
import { AppHeader } from "@/components/app/header";
import { Spinner } from "@/components/ui/spinner";
import { PlayerLayout } from "@/components/app/player-layout";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { Logo } from "@/components/app/logo";
import { Wordmark } from "@/components/app/wordmark";
import { Toaster } from "@/components/ui/toaster";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  // Step 1: Memoize the user document reference. It will be null until `user` is available.
  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, "users", user.uid) : null),
    [user, firestore]
  );

  // Step 2: Use the stable reference to fetch the user profile.
  const {
    data: userProfile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useDoc<UserProfile>(userDocRef);
  
  // The overall loading state depends on auth check AND profile fetch (if a user exists).
  const isLoading = isAuthLoading || (!!user && isProfileLoading);

  useEffect(() => {
    // Wait until all loading is complete before running any logic.
    if (isLoading) {
      return;
    }

    // If still no user after loading, they are not authenticated. Redirect to login.
    if (!user) {
      router.replace("/login");
      return;
    }
    
    // If user is authenticated but email is not verified, redirect.
    if (!user.emailVerified) {
       router.replace("/verify-email");
       return;
    }

    // If we have a verified user but no Firestore profile, something is wrong.
    // For now, we'll log it. In a real app, you might redirect to an error page.
    if (!userProfile) {
        console.error("User is authenticated, but Firestore profile is missing.");
        // Optional: redirect to a specific error page or logout.
        return;
    }

    // If the profile is incomplete for a player or staff, redirect to complete it.
    if ((userProfile.role === 'player' || userProfile.role === 'staff') && !userProfile.teamId) {
        router.replace('/complete-profile');
    }

  }, [user, userProfile, isLoading, router]);

  // Show a full-screen loading spinner until BOTH auth state AND user profile are resolved.
  // This is the key to preventing downstream components from running with incomplete data.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center justify-center gap-4">
          <Logo size="large" />
          <Wordmark size="large">Broos 2.0</Wordmark>
          <Spinner size="medium" className="mt-4" />
        </div>
      </div>
    );
  }

  // If after loading, there's still no profile, it's an unrecoverable state for the app layout.
  // Render nothing and let the redirection logic handle it.
  if (!userProfile) {
      return null;
  }
  
  // Render the correct layout based on the user's role.
  if (userProfile.role === "player") {
    return (
        <>
            <PlayerLayout>{children}</PlayerLayout>
            <Toaster />
        </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="flex-1 p-4">{children}</main>
      <Toaster />
    </div>
  );
}
