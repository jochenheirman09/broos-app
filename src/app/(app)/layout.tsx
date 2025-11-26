"use client";

import { useUser } from "@/context/user-context";
import { AppHeader } from "@/components/app/header";
import { Spinner } from "@/components/ui/spinner";
import { PlayerLayout } from "@/components/app/player-layout";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (!user.emailVerified) {
        router.replace("/verify-email");
      } else if (userProfile?.role === 'player' && (!userProfile.teamId || !userProfile.birthDate)) {
        router.replace('/complete-profile');
      }
    }
  }, [user, userProfile, loading, router]);


  // While loading, or if user is not yet available, or if the profile is incomplete,
  // show a spinner. The useEffect above will handle the redirection.
  if (loading || !user || !user.emailVerified || !userProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }
  
  if (userProfile?.role === 'player' && (!userProfile.birthDate || !userProfile.teamId)) {
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
      <AppHeader />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
