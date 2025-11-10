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
          <CardTitle>Recent Welzijnsoverzicht</CardTitle>
          <CardDescription>
            Een visueel overzicht van je recente scores. Klik op een staaf voor
            details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WellnessChart />
        </CardContent>
      </Card>
    </div>
  );
}
