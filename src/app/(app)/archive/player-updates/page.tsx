
"use client";

import { PlayerUpdates } from "@/components/app/player-updates";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PlayerUpdatesArchivePage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center text-2xl">
                <Sparkles className="h-6 w-6 mr-3 text-muted-foreground" />
                Archief Weetjes
              </CardTitle>
              <CardDescription>
                Een overzicht van al je eerder ontvangen weetjes.
              </CardDescription>
            </div>
            <Link href="/dashboard" passHref>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Terug naar Dashboard
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <PlayerUpdates status="archived" />
        </CardContent>
      </Card>
    </div>
  );
}
