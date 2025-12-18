
"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, LogOut, Building } from "lucide-react";
import Link from "next/link";
import { useUser } from "@/context/user-context";
import { Separator } from "../ui/separator";

export function ResponsibleNoClub() {
  const { logout } = useUser();

  return (
    <Card className="bg-accent/20 border-accent">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl">
          <Building className="h-7 w-7 mr-3 text-accent-foreground" />
          Club Instellen Vereist
        </CardTitle>
        <CardDescription className="text-accent-foreground/80">
          Om je dashboard te zien, moet je een club aanmaken of je opnieuw
          aansluiten bij je bestaande club. Als je dit net hebt gedaan, log dan
          eerst uit en opnieuw in om de wijzigingen te activeren.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button variant="accent" asChild className="w-full">
          <Link href="/create-club">
            <PlusCircle className="mr-2 h-5 w-5" />
            Club Aanmaken of Aansluiten
          </Link>
        </Button>
        <Separator />
        <Button variant="outline" onClick={logout} className="w-full">
          <LogOut className="mr-2 h-4 w-4" />
          Uitloggen en Opnieuw Inloggen
        </Button>
      </CardContent>
    </Card>
  );
}
