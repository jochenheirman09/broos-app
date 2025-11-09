"use client";

import { useUser } from "@/context/user-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { AppHeader } from "@/components/app/header";
import { Spinner } from "@/components/ui/spinner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, userProfile, loading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const isProfileIncomplete =
    userProfile &&
    ((userProfile.role === "player" &&
      (!userProfile.teamId || !userProfile.birthDate)) ||
      (userProfile.role === "staff" && !userProfile.teamId));

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

    if (isProfileIncomplete) {
      if (pathname !== "/complete-profile") {
        router.replace("/complete-profile");
      }
    } else if (pathname === "/complete-profile") {
      // If profile is complete, redirect away from setup page to dashboard
      router.replace("/dashboard");
    }
  }, [user, userProfile, loading, router, isProfileIncomplete, pathname]);

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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Only show the header if the profile is complete */}
      {!isProfileIncomplete && <AppHeader />}
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
