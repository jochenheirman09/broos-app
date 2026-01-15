
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
  const { user, loading: isAuthLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, "users", user.uid) : null),
    [user, firestore]
  );

  const {
    data: userProfile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useDoc<UserProfile>(userDocRef);
  
  const isLoading = isAuthLoading || (!!user && isProfileLoading);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user) {
      router.replace("/login");
      return;
    }
    
    if (!user.emailVerified) {
       router.replace("/verify-email");
       return;
    }

    if (!userProfile) {
        console.error("User is authenticated, but Firestore profile is missing.");
        return;
    }

    if ((userProfile.role === 'player' || userProfile.role === 'staff') && !userProfile.teamId) {
        router.replace('/complete-profile');
    }

  }, [user, userProfile, isLoading, router]);

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

  if (!userProfile) {
      return null;
  }
  
  if (userProfile.role === "player") {
    return (
        <>
            <PlayerLayout>
              {children}
            </PlayerLayout>
            <Toaster />
        </>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="container mx-auto flex-1 flex flex-col py-8 px-4 overflow-hidden h-full">
          {children}
      </main>
      <Toaster />
    </div>
  );
}
