
"use client";

import { useUser } from "@/context/user-context";
import { PlayerDashboard } from "./player-dashboard";
import { StaffDashboard } from "./staff-dashboard";
import { ResponsibleDashboard } from "./responsible-dashboard";
import { WelcomeHeader } from "./welcome-header";


export function DashboardContent() {
  const { userProfile } = useUser();

  if (!userProfile) {
    return null;
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
