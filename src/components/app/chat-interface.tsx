"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@/context/user-context";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import type { WellnessAnalysisInput, OnboardingOutput, FullWellnessAnalysisOutput } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollViewport } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SendHorizonal, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType, WithId } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "../ui/spinner";
import {
  collection,
  query,
  orderBy,
} from "firebase/firestore";
import { formatInTimeZone } from "date-fns-tz";
import { BuddyAvatar } from "./buddy-avatar";
import { chatWithBuddy } from "@/actions/chat-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

type BuddyResponse = (OnboardingOutput | FullWellnessAnalysisOutput) & {
    error?: 'service_unavailable' | 'configuration_error';
    response: string;
};

export function ChatInterface() {
  const { userProfile, user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<WellnessAnalysisInput | null>(null);

  const viewportRef = useRef<HTMLDivElement>(null);

  const buddyName = userProfile?.buddyName || "Broos";
  const firstName = userProfile?.name?.split(" ")[0] || "";

  const today = formatInTimeZone(new Date(), 'Europe/Brussels', "yyyy-MM-dd");

  const messagesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, "users", user.uid, "chats", today, "messages"),
      orderBy("sortOrder", "asc")
    );
  }, [user, db, today]);

  const { data: messages, isLoading: messagesLoading } =
    useCollection<ChatMessageType>(messagesQuery);
    
  const executeChat = useCallback(async (buddyInput: WellnessAnalysisInput): Promise<boolean> => {
    if (!user) return false;
    
    setIsLoading(true);
    setLastFailedMessage(null);
    
    try {
      const result: BuddyResponse = await chatWithBuddy(user.uid, buddyInput);

      if (result.error) {
        setLastFailedMessage(buddyInput);
        toast({ title: "Fout", description: result.response, variant: "destructive" });
        return false;
      }

      if (!result.response) throw new Error('AI returned an empty response.');

      return true;

    } catch (error: any) {
      console.error("[CLIENT] Error calling chatWithBuddy action:", error);
      setLastFailedMessage(buddyInput); 
      toast({
        variant: "destructive",
        title: "Communicatiefout",
        description: error.message || "Kon geen verbinding maken met de server.",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const handleInitialMessage = useCallback(async () => {
    if (!userProfile || !firstName) return;
    const buddyInput: WellnessAnalysisInput = {
      buddyName: buddyName,
      userName: firstName,
      userMessage: `Start het gesprek voor vandaag.`,
    };
    await executeChat(buddyInput);
  }, [firstName, buddyName, executeChat, userProfile]);

  useEffect(() => {
    if (!messagesLoading && (!messages || messages.length === 0) && firstName && userProfile) {
      handleInitialMessage();
    }
  }, [messagesLoading, messages, firstName, userProfile, handleInitialMessage]);


  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !userProfile || !firstName) return;

    const userMessageContent = input;
    setInput(""); 
    
    const buddyInput: WellnessAnalysisInput = {
      buddyName: buddyName,
      userName: firstName,
      userMessage: userMessageContent,
    };
    
    await executeChat(buddyInput);
  };
  
  const handleRetry = () => {
    if (lastFailedMessage) {
        executeChat(lastFailedMessage);
    }
  }

  if (messagesLoading && !messages) {
    return <div className="flex-grow flex items-center justify-center"><Spinner /></div>;
  }

  return (
    <div className="container mx-auto py-8">
        <Card className="h-[calc(100vh-10rem)] flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <MessageSquare className="h-6 w-6 mr-3" />
              Chat met {buddyName}
            </CardTitle>
            <CardDescription>Begin hier je gesprek met je persoonlijke AI-buddy.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col overflow-hidden p-0">
            <div className="flex flex-col h-full">
              <ScrollArea className="flex-grow">
                <ScrollViewport ref={viewportRef} className="h-full">
                  <div className="px-4">
                    {messages?.map((message) => (
                      <ChatMessage key={message.id} message={message} />
                    ))}
                    {isLoading && (
                      <div className="flex items-start gap-3 my-4 justify-start">
                        <BuddyAvatar className="h-10 w-10 border-2 border-primary" />
                        <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3 shadow-clay-card flex items-center gap-2">
                          <Spinner size="small" />
                          <span className="text-muted-foreground italic">{buddyName} denkt na...</span>
                        </div>
                      </div>
                    )}
                    {lastFailedMessage && !isLoading && (
                      <div className="flex items-start gap-3 my-4 justify-start">
                        <BuddyAvatar className="h-10 w-10 border-2 border-destructive" />
                        <div className="bg-destructive/10 rounded-2xl rounded-tl-none px-4 py-3 shadow-clay-card flex flex-col items-start gap-2">
                            <p className="text-destructive/90">Kon het laatste bericht niet verwerken.</p>
                            <Button variant="destructive" size="sm" onClick={handleRetry}>
                                <RotateCw className="h-4 w-4 mr-2" />
                                Opnieuw proberen
                            </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollViewport>
              </ScrollArea>
              <div className="p-4 border-t">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Typ je bericht..."
                    autoComplete="off"
                    disabled={isLoading || (!messages)}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isLoading || !input.trim() || (!messages)}
                  >
                    <SendHorizonal className="h-5 w-5" />
                  </Button>
                </form>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}

function ChatMessage({ message }: { message: WithId<ChatMessageType> }) {
  const { userProfile } = useUser();
  const isUser = message.role === "user";
  
  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  const initials = getInitials(userProfile?.name);

  return (
    <div className={cn("flex items-start gap-3 my-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && <BuddyAvatar className="h-10 w-10 border-2 border-primary" />}
      <div
        className={cn(
          "max-w-md rounded-2xl px-4 py-3 shadow-clay-card",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-none"
            : "bg-muted rounded-tl-none"
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
      {isUser && (
        <Avatar className="h-10 w-10 border-2 border-primary/50">
          <AvatarFallback className="bg-primary/20 text-primary font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
