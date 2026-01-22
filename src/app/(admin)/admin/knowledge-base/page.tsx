"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookOpen } from "lucide-react";
import { KnowledgeBaseManager } from "@/components/app/knowledge-base-stats";

export default function KnowledgeBasePage() {
  return (
    <Card className="w-full">
        <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
                <BookOpen className="h-7 w-7 text-primary" />
                Kennisbank Beheer
            </CardTitle>
            <CardDescription>
                Beheer de documenten die de AI-buddy gebruikt om contextuele antwoorden te geven.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <KnowledgeBaseManager />
        </CardContent>
    </Card>
  );
}
