
"use client";

import { DashboardContent } from "@/components/app/dashboard-content";
import { useUser } from "@/context/user-context";
import { Spinner } from "@/components/ui/spinner";
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { RequestNotificationPermission } from "@/components/app/request-notification-permission";

export default function DashboardPage() {
  const { userProfile, loading } = useUser();
  console.log('[DashboardPage] Rendering...', { loading, hasProfile: !!userProfile });

  if (loading) {
    console.log('[DashboardPage] Showing spinner because context is loading.');
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!userProfile) {
    console.log('[DashboardPage] No user profile, rendering null. Redirect should be handled by provider.');
    return null;
  }
  
  console.log('[DashboardPage] Rendering DashboardContent.');
  return (
    <div className="space-y-6">
      <RequestNotificationPermission />
      <DashboardContent />
    </div>
  );
}
