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
import { Archive as ArchiveIcon, MessageSquare, Trash2, ShieldAlert } from "lucide-react";
import { Chat, WithId } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { deleteAllUserChats } from "@/lib/firebase/firestore/chat";

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
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const chatsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, "users", user.uid, "chats"),
      orderBy("date", "desc")
    );
  }, [user, db]);

  const { data: chats, isLoading, forceRefetch } = useCollection<Chat>(chatsQuery);

  const handleDeleteHistory = async () => {
    if (!user || !db) return;
    setIsDeleting(true);
    try {
      await deleteAllUserChats(db, user.uid);
      toast({
        title: "Geschiedenis gewist",
        description: "Al je gesprekken zijn succesvol verwijderd.",
      });
      forceRefetch(); // Force a refetch of the collection hook
    } catch (error) {
      console.error("Fout bij het wissen van de geschiedenis:", error);
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Kon de geschiedenis niet wissen. Probeer het opnieuw.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center text-2xl">
                <ArchiveIcon className="h-6 w-6 mr-3" />
                Gespreksarchief
              </CardTitle>
              <CardDescription>
                Bekijk hier je vorige gesprekken met je buddy.
              </CardDescription>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Wis Geschiedenis
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <ShieldAlert className="h-6 w-6 text-destructive" />
                    Weet je het absoluut zeker?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Dit is een onomkeerbare actie. Al je chatberichten en
                    gesprekssamenvattingen worden permanent verwijderd. Dit kan
                    niet ongedaan worden gemaakt.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>
                    Annuleren
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteHistory}
                    disabled={isDeleting}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {isDeleting && <Spinner size="small" className="mr-2" />}
                    Ja, verwijder alles
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
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
              <p className="text-muted-foreground">
                Je hebt nog geen gesprekken in je archief.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
