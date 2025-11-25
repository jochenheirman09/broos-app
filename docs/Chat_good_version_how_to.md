
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@/context/user-context";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { type WellnessAnalysisInput, type WellnessAnalysisOutput, type OnboardingOutput } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollViewport } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SendHorizonal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType, WithId } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "../ui/spinner";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { format } from "date-fns";
import { BuddyAvatar } from "./buddy-avatar";
import { chatWithBuddy } from "@/app/actions/chat-actions";

export function ChatInterface() {
  const { userProfile, user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const buddyName = userProfile?.buddyName || "Broos";
  const firstName = userProfile?.name?.split(" ")[0] || "";

  const today = format(new Date(), "yyyy-MM-dd");

  const messagesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, "users", user.uid, "chats", today, "messages"),
      orderBy("timestamp", "asc"),
      limit(50)
    );
  }, [user, db, today]);

  const { data: messages, isLoading: messagesLoading } =
    useCollection<ChatMessageType>(messagesQuery);

  const addMessageToDb = useCallback(
    async (role: 'assistant' | 'user', content: string) => {
      if (!user || !db) return;
      // This is a fire-and-forget write to Firestore on the client.
      addDoc(
        collection(db, "users", user.uid, "chats", today, "messages"),
        {
          role,
          content,
          timestamp: serverTimestamp(),
        }
      );
    }, [user, db, today]
  );
  
  const handleInitialMessage = useCallback(async () => {
    if (!userProfile || !user || !db || !firstName) return;

    setIsLoading(true);

    try {
      const buddyInput: WellnessAnalysisInput = {
        buddyName: buddyName,
        userName: firstName,
        userMessage: `Start het gesprek voor vandaag.`,
        chatHistory: '',
      };
      
      console.log("[CLIENT] Sending initial message request to Server Action.");
      const result = await chatWithBuddy(user.uid, buddyInput);
      
      const responseContent = (result as OnboardingOutput | WellnessAnalysisOutput).response;

      if (!responseContent) {
        throw new Error('AI returned an empty response.');
      }
      
      await addMessageToDb("assistant", responseContent);

    } catch (error: any) {
      console.error("[CLIENT] Error fetching initial message:", error);
      toast({
        variant: "destructive",
        title: "Oh nee!",
        description: error.message || "Kon het gesprek niet starten. Probeer de pagina te vernieuwen.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, userProfile, db, firstName, buddyName, addMessageToDb, toast]);

  useEffect(() => {
    if (!messagesLoading && messages?.length === 0 && firstName) {
      handleInitialMessage();
    }
  }, [messagesLoading, messages, firstName, handleInitialMessage]);

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
    if (!input.trim() || !userProfile || !user || !db || !firstName) return;

    const userMessageContent = input;
    setInput("");

    // Optimistically add user message to Firestore
    await addMessageToDb("user", userMessageContent);

    setIsLoading(true);

    try {
      const chatHistory = (messages || [])
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
      
      const buddyInput: WellnessAnalysisInput = {
        buddyName: buddyName,
        userName: firstName,
        userMessage: userMessageContent,
        chatHistory: chatHistory,
      };

      console.log(`[CLIENT] Sending message: "${userMessageContent}"`);
      const result = await chatWithBuddy(user.uid, buddyInput);
      
      const responseContent = (result as OnboardingOutput | WellnessAnalysisOutput).response;
      
      if (!responseContent) {
        throw new Error('AI returned an empty response.');
      }
      
      // Add assistant response to Firestore
      await addMessageToDb("assistant", responseContent);

    } catch (error: any) {
      console.error("[CLIENT] Error calling Server Action:", error);
      toast({
        variant: "destructive",
        title: "Oh nee!",
        description: error.message || "Er is iets misgegaan. Je bericht is niet verzonden, probeer het opnieuw.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (messagesLoading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col bg-card rounded-2xl shadow-clay-card">
      <div className="flex-grow flex flex-col overflow-hidden">
        <div className="p-4 border-b">
            <h2 className="text-xl font-bold">Chat met {buddyName}</h2>
        </div>
        <ScrollArea className="flex-grow">
          <ScrollViewport ref={viewportRef} className="h-full">
            <div className="p-4">
              {messages?.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex items-start gap-3 my-4 justify-start">
                  <BuddyAvatar className="h-10 w-10 border-2 border-primary" />
                  <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3 shadow-clay-card flex items-center gap-2">
                    <Spinner size="small" />
                    <span className="text-muted-foreground italic">
                      {buddyName} denkt na...
                    </span>
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
              disabled={isLoading || (!messages || messages.length === 0)}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim() || (!messages || messages.length === 0)}
            >
              <SendHorizonal className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: WithId<ChatMessageType> }) {
  const { userProfile } = useUser();
  const isUser = message.role === "user";
  
  const getInitials = (name: string | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const initials = getInitials(userProfile?.name);

  return (
    <div
      className={cn(
        "flex items-start gap-3 my-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {!isUser && (
        <BuddyAvatar className="h-10 w-10 border-2 border-primary" />
      )}
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
