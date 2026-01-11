"use client";

import { useEffect } from "react";
import { PlayerDashboard } from "./player-dashboard";
import { StaffDashboard } from "./staff-dashboard";
import { ResponsibleDashboard } from "./responsible-dashboard";
import { WelcomeHeader } from "./welcome-header";
import { Spinner } from "@/components/ui/spinner";
import { useUser } from "@/context/user-context";
import { useFirebaseApp } from "@/firebase";
import { getMessaging, getToken } from "firebase/messaging";
import { RequestNotificationPermission } from "./request-notification-permission"; // Import the new component

export function DashboardContent() {
  const { userProfile, loading: isProfileLoading } = useUser();
  const app = useFirebaseApp();

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
      
      {/* This component will only render if permission needs to be asked */}
      <RequestNotificationPermission />

      {role === 'player' && <PlayerDashboard />}
      {role === 'staff' && clubId && <StaffDashboard clubId={clubId} />}
      {role === 'responsible' && <ResponsibleDashboard clubId={clubId} />}
    </div>
  );
}
