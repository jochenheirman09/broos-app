
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, MessageSquare } from "lucide-react";
import { NewChat } from "@/components/app/p2p-chat/new-chat";
import { ExistingChatsList } from "@/components/app/p2p-chat/existing-chats-list";

export default function P2PChatOverviewPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Users className="h-6 w-6 mr-3" />
            Team Chat
          </CardTitle>
          <CardDescription>
            Bekijk je bestaande gesprekken of start een nieuw gesprek met je teamleden.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="existing">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">
                <MessageSquare className="mr-2 h-4 w-4" />
                Bestaande Gesprekken
              </TabsTrigger>
              <TabsTrigger value="new">
                <Users className="mr-2 h-4 w-4" />
                Nieuw Gesprek
              </TabsTrigger>
            </TabsList>
            <TabsContent value="existing" className="mt-6">
              <ExistingChatsList />
            </TabsContent>
            <TabsContent value="new" className="mt-6">
                <NewChat />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
