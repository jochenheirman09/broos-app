"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@/context/user-context";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { Archive as ArchiveIcon, MessageSquare } from "lucide-react";
import { Chat, WithId } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";

function ChatArchiveItem({ chat }: { chat: WithId<Chat> }) {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-4">
        <MessageSquare className="h-6 w-6 text-primary" />
        <div>
          <p className="font-semibold">
            Gesprek van {format(new Date(chat.date), "PPP", { locale: nl })}
          </p>
          <p className="text-sm text-muted-foreground truncate max-w-md">
            {chat.summary}
          </p>
        </div>
      </div>
      {/* <Button variant="outline" size="sm">Bekijk</Button> */}
    </div>
  );
}

export default function ArchivePage() {
  const { user } = useUser();
  const db = useFirestore();

  const chatsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, "users", user.uid, "chats"),
      orderBy("date", "desc")
    );
  }, [user, db]);

  const { data: chats, isLoading } = useCollection<Chat>(chatsQuery);

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
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <Spinner />
            </div>
          )}
          {!isLoading && chats && chats.length > 0 && (
            <div className="border rounded-lg">
              {chats.map((chat) => (
                <ChatArchiveItem key={chat.id} chat={chat} />
              ))}
            </div>
          )}
          {!isLoading && (!chats || chats.length === 0) && (
            <div className="h-64 border rounded-lg flex items-center justify-center bg-muted/20">
              <p className="text-muted-foreground">Je hebt nog geen gesprekken in je archief.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
