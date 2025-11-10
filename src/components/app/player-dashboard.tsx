"use client";

import { useUser } from "@/context/user-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { WellnessChart } from "./wellness-chart";
import { PlayerUpdates } from "./player-updates";
import { Separator } from "../ui/separator";

export function PlayerDashboard() {
  const { userProfile } = useUser();

  return (
    <div className="space-y-6">
      <Card className="text-center">
        <CardHeader>
          <CardTitle>Welkom terug, {userProfile?.name}!</CardTitle>
          <CardDescription>Klaar om te reflecteren met je buddy?</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/chat">
            <Button size="lg" className="w-full sm:w-auto">
              Start Gesprek met Broos
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Jouw Recente Weetjes</CardTitle>
          <CardDescription>
            Interessante inzichten en vergelijkingen met je team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PlayerUpdates />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Recent Welzijnsoverzicht</CardTitle>
          <CardDescription>
            Een visueel overzicht van je recente scores.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WellnessChart />
        </CardContent>
      </Card>
    </div>
  );
}
