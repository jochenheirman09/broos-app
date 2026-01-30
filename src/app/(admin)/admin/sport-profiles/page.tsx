
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks } from "lucide-react";
import { SportProfileManager } from "@/components/app/admin/sport-profile-manager";

export default function SportProfilesPage() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-2xl">
          <ListChecks className="h-7 w-7 text-primary" />
          Sportprofielen Beheren
        </CardTitle>
        <CardDescription>
          Beheer de sporten die beschikbaar zijn in de applicatie, inclusief hun namen en slogans. Deze lijst wordt gebruikt bij het aanmaken van een nieuwe club.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SportProfileManager />
      </CardContent>
    </Card>
  );
}
