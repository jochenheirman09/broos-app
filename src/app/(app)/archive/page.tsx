"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Archive as ArchiveIcon } from "lucide-react";

export default function ArchivePage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <ArchiveIcon className="h-6 w-6 mr-3" />
            Gespreksarchief
          </CardTitle>
          <CardDescription>
            Bekijk hier je vorige gesprekken met je buddy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 border rounded-lg flex items-center justify-center bg-muted/20">
            <p className="text-muted-foreground">Archief komt hier...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
