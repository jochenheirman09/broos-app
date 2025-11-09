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
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Club } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { CreateTeamForm } from "./create-team-form";
import { TeamList } from "./team-list";
import { Separator } from "../ui/separator";

const roleIcons: { [key: string]: React.ReactNode } = {
  player: <User className="h-5 w-5 mr-2" />,
  staff: <Users className="h-5 w-5 mr-2" />,
  responsible: <Shield className="h-5 w-5 mr-2" />,
};

function ClubInfo({ clubId }: { clubId: string }) {
  const firestore = useFirestore();
  const clubRef = useMemoFirebase(
    () => (firestore ? doc(firestore, "clubs", clubId) : null),
    [firestore, clubId]
  );
  const { data: club, isLoading } = useDoc<Club>(clubRef);

  if (isLoading) {
    return <Spinner />;
  }

  if (!club) {
    return (
      <p className="text-destructive">
        Error: Club data not found for your account.
      </p>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl font-bold">
          <Building className="h-6 w-6 mr-3 text-primary" />
          {club.name}
        </CardTitle>
        <CardDescription>
          Welcome to your club dashboard. Manage your teams from here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Teams</h3>
          <TeamList clubId={club.id} />
        </div>
        <Separator />
        <div>
          <h3 className="text-lg font-semibold mb-2">Add a New Team</h3>
          <CreateTeamForm clubId={club.id} />
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardContent() {
  const { userProfile } = useUser();

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
            This is your main dashboard. Manage your club and members from here.
          </p>
        </CardContent>
      </Card>

      {role === "responsible" && clubId && <ClubInfo clubId={clubId} />}

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
