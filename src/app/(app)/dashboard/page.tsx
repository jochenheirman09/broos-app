"use client";

import { DashboardContent } from "@/components/app/dashboard-content";
import { useUser } from "@/context/user-context";
import { Spinner } from "@/components/ui/spinner";

export default function DashboardPage() {
  const { userProfile, loading } = useUser();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!userProfile) {
    // This can happen briefly during logout or if there's an error.
    // The layout will handle redirection.
    return null;
  }

  return (
    <div className="container mx-auto py-8">
      <DashboardContent />
    </div>
  );
}
