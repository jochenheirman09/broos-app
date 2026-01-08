"use client";

import { useEffect } from "react";
import { useUser } from "@/context/user-context";
import { PlayerDashboard } from "./player-dashboard";
import { StaffDashboard } from "./staff-dashboard";
import { ResponsibleDashboard } from "./responsible-dashboard";
import { WelcomeHeader } from "./welcome-header";
import { Spinner } from "@/components/ui/spinner";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { useRequestNotificationPermission } from "@/lib/firebase/messaging";

export function DashboardContent() {
  const { userProfile, loading } = useUser();
  const { requestPermission: refreshToken } = useRequestNotificationPermission();

  useEffect(() => {
    // This effect tries to silently refresh the token in the background on load.
    const autoRefreshToken = async () => {
      // Wait for user profile and ensure we are in a browser
      if (!userProfile?.uid || typeof window === 'undefined') return;

      if ('serviceWorker' in navigator) {
        try {
          // Wait for the Service Worker to be ready
          await navigator.serviceWorker.ready;
          
          // Small delay (500ms) to ensure everything is stable
          setTimeout(() => {
            // The refreshToken function (from useRequestNotificationPermission)
            // now handles the logic of checking permission and getting the token.
            // Pass `true` to indicate a silent refresh.
            console.log('[DashboardContent] Attempting to silently update FCM token.');
            refreshToken(true); 
          }, 500); 

        } catch (swErr) {
          console.error("Service Worker not ready for auto-refresh:", swErr);
        }
      }
    };

    autoRefreshToken();
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
      <WelcomeHeader />
      
      {role === 'player' && <PlayerDashboard />}
      {role === 'staff' && clubId && <StaffDashboard clubId={clubId} />}
      {role === 'responsible' && <ResponsibleDashboard clubId={clubId} />}
    </div>
  );
}
