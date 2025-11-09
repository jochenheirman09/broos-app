"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <MessageSquare className="h-6 w-6 mr-3" />
            Chat met je Buddy
          </CardTitle>
          <CardDescription>
            Hier kun je binnenkort chatten met je AI-buddy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 border rounded-lg flex items-center justify-center bg-muted/20">
            <p className="text-muted-foreground">Chat-interface komt hier...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
