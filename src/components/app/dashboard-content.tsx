
"use client";

import { useEffect } from "react";
import { useUser } from "@/context/user-context";
import { PlayerDashboard } from "./player-dashboard";
import { StaffDashboard } from "./staff-dashboard";
import { ResponsibleDashboard } from "./responsible-dashboard";
import { WelcomeHeader } from "./welcome-header";
import { Spinner } from "@/components/ui/spinner";
import { RequestNotificationPermission } from "@/components/app/request-notification-permission";
import { useRequestNotificationPermission } from "@/lib/firebase/messaging";

export function DashboardContent() {
  const { userProfile, loading } = useUser();
  const { requestPermission: refreshToken } = useRequestNotificationPermission();

  useEffect(() => {
    // This effect tries to silently refresh the token in the background on load.
    // It will only proceed if permission is already granted.
    if (userProfile?.uid && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      console.log('[DashboardContent] Attempting silent FCM token refresh on load.');
      refreshToken(true); // `true` indicates a silent attempt.
    }
  }, [userProfile?.uid, refreshToken]);

  if (loading || !userProfile) {
     return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const { role, clubId } = userProfile;

  return (
    <div className="space-y-6">
      <RequestNotificationPermission />
      <WelcomeHeader />
      
      {role === 'player' && <PlayerDashboard />}
      {role === 'staff' && clubId && <StaffDashboard clubId={clubId} />}
      {role === 'responsible' && <ResponsibleDashboard clubId={clubId} />}
    </div>
  );
}
