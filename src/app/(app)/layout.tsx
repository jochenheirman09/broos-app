"use client";

import { useUser } from "@/context/user-context";
import { AppHeader } from "@/components/app/header";
import { Spinner } from "@/components/ui/spinner";
import { PlayerLayout } from "@/components/app/player-layout";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) {
      console.log('[AppLayout] Waiting for user context to load...');
      return;
    }

    if (!user) {
      console.log('[AppLayout] No user found, redirecting to /login.');
      router.replace("/login");
      return;
    }

    if (!user.emailVerified) {
      console.log('[AppLayout] User not verified, redirecting to /verify-email.');
      router.replace("/verify-email");
      return;
    }

    if (userProfile) {
      const isPlayerStaffProfileIncomplete = (userProfile.role === 'player' || userProfile.role === 'staff') && (!userProfile.teamId || !userProfile.birthDate);
      
      if (isPlayerStaffProfileIncomplete && pathname !== '/complete-profile') {
        console.log('[AppLayout] Player/Staff profile incomplete, redirecting to /complete-profile.');
        router.replace('/complete-profile');
      } else if (!isPlayerStaffProfileIncomplete && pathname === '/complete-profile') {
        // **DE FIX:** Als het profiel compleet is en we zijn nog steeds op de profielpagina, stuur door!
        console.log('[AppLayout] Profile is now complete, redirecting from /complete-profile to /dashboard.');
        router.replace('/dashboard');
      }
    }
    
  }, [user, userProfile, loading, router, pathname]);

  // If the initial context load is happening, or if we are in a state that will trigger
  // a redirect, show a spinner to prevent flashing content.
  if (loading || !user || !user.emailVerified || !userProfile) {
     console.log('[AppLayout] Showing spinner due to loading or pending redirect.');
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }

  // Once loading is complete and profile is verified and present, check role for layout.
  if (userProfile.role === "player") {
    console.log('[AppLayout] Rendering PlayerLayout.');
    return <PlayerLayout>{children}</PlayerLayout>;
  }
  
  console.log('[AppLayout] Rendering Standard App Layout.');
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
