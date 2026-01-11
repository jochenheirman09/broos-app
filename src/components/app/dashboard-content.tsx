
"use client";

import { useEffect } from "react";
import { PlayerDashboard } from "./player-dashboard";
import { StaffDashboard } from "./staff-dashboard";
import { ResponsibleDashboard } from "./responsible-dashboard";
import { WelcomeHeader } from "./welcome-header";
import { Spinner } from "@/components/ui/spinner";
import { useUser } from "@/context/user-context";

export function DashboardContent() {
  const { userProfile, loading: isProfileLoading } = useUser();

  // This log confirms the component re-renders when the profile is loaded.
  useEffect(() => {
    console.log("🚀 DEBUG: DashboardContent is loaded. Profile available:", !!userProfile);
  }, [userProfile]);

  if (isProfileLoading || !userProfile) {
     return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const { role, clubId } = userProfile;

  return (
    <div className="space-y-6">
      <WelcomeHeader />
      
      {role === 'player' && <PlayerDashboard />}
      {role === 'staff' && clubId && <StaffDashboard clubId={clubId} />}
      {role === 'responsible' && <ResponsibleDashboard clubId={clubId} />}
    </div>
  );
}
