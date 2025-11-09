"use client";

import { useAuth } from "@/context/auth-context";
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

const roleIcons: { [key: string]: React.ReactNode } = {
  player: <User className="h-5 w-5 mr-2" />,
  staff: <Users className="h-5 w-5 mr-2" />,
  responsible: <Shield className="h-5 w-5 mr-2" />,
};

export function DashboardContent() {
  const { userProfile } = useAuth();

  if (!userProfile) {
    return null;
  }

  const { name, role, clubId } = userProfile;

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Welcome, {name}!</CardTitle>
          <div className="flex items-center text-muted-foreground bg-muted px-3 py-1 rounded-full text-sm font-medium">
            {roleIcons[role]}
            <span className="capitalize">{role}</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-lg text-muted-foreground">
            Hello, my name is {name} and my role is {role}.
          </p>
        </CardContent>
      </Card>

      {role === "responsible" && !clubId && (
        <Card className="border-accent bg-accent/10">
          <CardHeader>
            <CardTitle className="flex items-center text-accent-foreground/80">
              <Building className="h-6 w-6 mr-3 text-accent" />
              Create Your Club
            </CardTitle>
            <CardDescription className="text-accent-foreground/70">
              To continue using the app, you need to create a club for your
              account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/create-club">
              <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Club
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
