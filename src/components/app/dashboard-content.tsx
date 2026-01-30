"use client";

import { useEffect } from "react";
import { PlayerDashboard } from "./player-dashboard";
import { StaffDashboard } from "./staff-dashboard";
import { ResponsibleDashboard } from "./responsible-dashboard";
import { SportProfileCard } from "./sport-profile-card"; // This is now the combined component
import { Spinner } from "@/components/ui/spinner";
import { useUser } from "@/context/user-context";
import { RequestNotificationPermission } from "./request-notification-permission";
// The WelcomeHeader is no longer needed here.

export function DashboardContent() {
  const { userProfile, loading: isProfileLoading } = useUser();

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
      <SportProfileCard /> {/* This now contains the welcome message and sport info */}
      <RequestNotificationPermission />

      {role === 'player' && <PlayerDashboard />}
      {role === 'staff' && clubId && <StaffDashboard clubId={clubId} />}
      {role === 'responsible' && <ResponsibleDashboard clubId={clubId} />}
    </div>
  );
}
