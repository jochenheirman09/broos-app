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
import React, { useCallback, useState } from "react";
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
  const [refreshKey, setRefreshKey] = useState(0);

  const clubRef = useMemoFirebase(
    () => (firestore ? doc(firestore, "clubs", clubId) : null),
    [firestore, clubId]
  );
  const { data: club, isLoading } = useDoc<Club>(clubRef);

  const handleTeamChange = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center p-8">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  if (!club) {
    return (
      <Card>
        <CardContent>
          <p className="text-destructive">
            Error: Club data not found for your account.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-3xl font-bold">
          <Building className="h-8 w-8 mr-3 text-primary" />
          {club.name}
        </CardTitle>
        <CardDescription className="text-lg">
          Welcome to your club dashboard. Manage your teams from here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div>
          <h3 className="text-xl font-semibold mb-4">Your Teams</h3>
          <TeamList
            clubId={club.id}
            key={refreshKey}
            onCodeGenerated={handleTeamChange}
          />
        </div>
        <Separator />
        <div>
          <h3 className="text-xl font-semibold mb-4">Add a New Team</h3>
          <CreateTeamForm clubId={club.id} onTeamCreated={handleTeamChange} />
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-3xl font-bold">Welcome, {name}!</CardTitle>
          <div className="flex items-center bg-secondary text-secondary-foreground px-4 py-2 rounded-full text-base font-medium shadow-clay-inset">
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
        <Card className="bg-accent/20 border-accent">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Building className="h-7 w-7 mr-3 text-accent-foreground" />
              Create Your Club
            </CardTitle>
            <CardDescription className="text-accent-foreground/80">
              To continue using the app, you need to create a club for your
              account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/create-club">
              <Button
                variant="accent"
                size="lg"
              >
                <PlusCircle className="mr-2 h-5 w-5" />
                Create Club
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
