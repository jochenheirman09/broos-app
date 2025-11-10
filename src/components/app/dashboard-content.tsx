"use client";

import { useUser } from "@/context/user-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle, Building, User, Users, Shield } from "lucide-react";
import React from "react";
import { PlayerDashboard } from "./player-dashboard";
import { StaffDashboard } from "./staff-dashboard";
import { ResponsibleDashboard } from "./responsible-dashboard";

const roleIcons: { [key: string]: React.ReactNode } = {
  player: <User className="h-5 w-5 mr-2" />,
  staff: <Users className="h-5 w-5 mr-2" />,
  responsible: <Shield className="h-5 w-5 mr-2" />,
};

const RoleSpecificDashboard = ({
  role,
  clubId,
}: {
  role: string;
  clubId?: string;
}) => {
  if (role === "player") {
    return <PlayerDashboard />;
  }
  if (role === "staff" && clubId) {
    return <StaffDashboard clubId={clubId} />;
  }
  if (role === "responsible" && clubId) {
    return <ResponsibleDashboard clubId={clubId} />;
  }

  // Fallback for responsible user without a club yet
  if (role === "responsible" && !clubId) {
    return (
      <Card className="bg-accent/20 border-accent">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Building className="h-7 w-7 mr-3 text-accent-foreground" />
            Creëer Je Club
          </CardTitle>
          <CardDescription className="text-accent-foreground/80">
            Om de app te blijven gebruiken, moet je een club aanmaken voor je
            account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/create-club">
            <Button variant="accent" size="lg">
              <PlusCircle className="mr-2 h-5 w-5" />
              Club aanmaken
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return null;
};


export function DashboardContent() {
  const { userProfile } = useUser();

  if (!userProfile) {
    return null;
  }

  const { name, role, clubId } = userProfile;

  return (
    <div className="space-y-6">
      {role !== 'player' && (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-2xl font-bold">Welkom, {name}!</CardTitle>
            <div className="flex items-center bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full text-sm font-medium shadow-clay-inset">
                {roleIcons[role]}
                <span className="capitalize">{role}</span>
            </div>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                Dit is je hoofddashboard. Beheer hier je club en leden.
                </p>
            </CardContent>
        </Card>
      )}
      
      <RoleSpecificDashboard role={role} clubId={clubId} />
    </div>
  );
}
