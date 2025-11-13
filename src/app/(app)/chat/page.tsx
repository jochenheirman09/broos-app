"use client";

import { ChatInterface } from "@/components/app/chat-interface";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@/context/user-context";
import { MessageSquare } from "lucide-react";

export default function ChatPage() {
  const { userProfile } = useUser();
  const buddyName = userProfile?.buddyName || "Broos";

  return (
    <div className="container mx-auto py-8">
      <Card className="h-[calc(100vh-10rem)] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <MessageSquare className="h-6 w-6 mr-3" />
            Chat met {buddyName}
          </CardTitle>
          <CardDescription>
            Begin hier je gesprek met je persoonlijke AI-buddy.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col overflow-hidden">
          <ChatInterface />
        </CardContent>
      </Card>
    </div>
  );
}
