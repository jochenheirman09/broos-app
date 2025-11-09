"use client";

import { useUser } from "@/context/user-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppHeader } from "@/components/app/header";
import { Spinner } from "@/components/ui/spinner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
        return;
      }
      if (!user.emailVerified) {
        router.replace("/verify-email");
        return;
      }

      // Profile completion check
      if (userProfile) {
        const isPlayerOrStaff =
          userProfile.role === "player" || userProfile.role === "staff";
        if (isPlayerOrStaff && !userProfile.teamId) {
          // If player/staff has not completed profile setup (e.g., joined a team)
          if (window.location.pathname !== "/complete-profile") {
            router.replace("/complete-profile");
          }
        } else if (window.location.pathname === "/complete-profile") {
          // If profile is complete, redirect away from setup page to dashboard
          router.replace("/dashboard");
        }
      }
    }
  }, [user, userProfile, loading, router]);

  if (loading || !user || !user.emailVerified) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }

  // Prevent rendering children if redirection is imminent
  if (
    userProfile &&
    (userProfile.role === "player" || userProfile.role === "staff") &&
    !userProfile.teamId
  ) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
