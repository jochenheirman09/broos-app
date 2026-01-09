
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
import { Archive as ArchiveIcon, MessageSquare, FileWarning } from "lucide-react";
import { Chat, WithId } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";
import { formatInTimeZone } from 'date-fns-tz';
import { nl } from "date-fns/locale";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";


function ChatArchiveItem({ chat }: { chat: WithId<Chat> }) {
  const formattedDate = formatInTimeZone(chat.date, 'UTC', 'PPP', { locale: nl });

  return (
    <div className="flex items-center justify-between p-4 border-b last:border-b-0">
      <div className="flex items-center gap-4">
        <MessageSquare className="h-6 w-6 text-primary" />
        <div>
          <p className="font-semibold">
            Gesprek van {formattedDate}
          </p>
          <p className="text-sm text-muted-foreground truncate max-w-xs sm:max-w-md">
            {chat.summary}
          </p>
        </div>
      </div>
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

  const { data: chats, isLoading, error } = useCollection<Chat>(chatsQuery);

  const hasNoData = !isLoading && (!chats || chats.length === 0);
  
  // This is the key change: we check if there's an error BUT ALSO if there is no data.
  // This is a strong indicator that the "error" is just a permission denied on a non-existent collection for a new user.
  const displayEmptyState = hasNoData || (error && hasNoData);

  // We only show a true error if there's an error and we aren't already showing the empty state.
  const displayErrorState = error && !displayEmptyState;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <div>
              <CardTitle className="flex items-center text-2xl">
                <ArchiveIcon className="h-6 w-6 mr-3" />
                Gespreksarchief
              </CardTitle>
              <CardDescription>
                Bekijk hier je vorige gesprekken met je buddy.
              </CardDescription>
            </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center h-64">
              <Spinner />
            </div>
          )}
          {displayEmptyState && (
            <div className="h-64 border rounded-lg flex items-center justify-center bg-muted/20">
              <p className="text-muted-foreground">
                Je hebt nog geen gesprekken in je archief.
              </p>
            </div>
          )}
          {displayErrorState && (
             <Alert variant="destructive">
                <FileWarning className="h-4 w-4" />
                <AlertTitle>Fout bij laden</AlertTitle>
                <AlertDescription>
                    Kon je archief niet laden. Dit kan een permissieprobleem zijn. Probeer de pagina te vernieuwen.
                </AlertDescription>
            </Alert>
          )}
          {!isLoading && !displayEmptyState && !displayErrorState && chats && (
            <div className="border rounded-lg">
              {chats.map((chat) => (
                <ChatArchiveItem key={chat.id} chat={chat} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
