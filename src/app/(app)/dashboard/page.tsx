"use client";

import { DashboardContent } from "@/components/app/dashboard-content";
import { useUser } from "@/context/user-context";

export default function DashboardPage() {
  const { userProfile } = useUser();

  if (!userProfile) return null;

  return (
    <div className="container mx-auto">
      <DashboardContent />
    </div>
  );
}
