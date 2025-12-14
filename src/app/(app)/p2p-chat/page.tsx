
"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, MessageSquare, ArrowLeft } from "lucide-react";
import { NewChat } from "@/components/app/p2p-chat/new-chat";
import { ExistingChatsList } from "@/components/app/p2p-chat/existing-chats-list";
import { useUser } from "@/context/user-context";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function P2PChatOverviewPage() {
  const { userProfile } = useUser();
  const isPlayer = userProfile?.role === 'player';

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center text-2xl">
                <Users className="h-6 w-6 mr-3" />
                Team Chat
              </CardTitle>
              <CardDescription>
                Bekijk je bestaande gesprekken of start een nieuw gesprek met je teamleden.
              </CardDescription>
            </div>
            {!isPlayer && (
                 <Link href="/dashboard" passHref>
                    <Button variant="outline">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Terug naar Dashboard
                    </Button>
                 </Link>
            )}
          </div>
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
