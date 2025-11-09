"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@/context/user-context";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { chatWithBuddy } from "@/ai/flows/buddy-flow";
import { saveWellnessScores, saveAlert } from "@/lib/wellness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SendHorizonal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType, WithId, Alert } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "./logo";
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

function ChatMessage({ message }: { message: WithId<ChatMessageType> }) {
  const { userProfile } = useUser();
  const isAssistant = message.role === "assistant";

  const getInitials = (name: string = "") => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 my-4",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      {isAssistant && (
        <Avatar className="h-10 w-10 border-2 border-primary">
          <AvatarFallback>
            <Logo size="normal" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-sm md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl shadow-clay-card",
          isAssistant
            ? "bg-muted rounded-tl-none"
            : "bg-primary text-primary-foreground rounded-br-none"
        )}
      >
        <p className="text-base">{message.content}</p>
      </div>
      {!isAssistant && userProfile && (
        <Avatar className="h-10 w-10 border-2 border-secondary">
          <AvatarImage src={userProfile.photoURL} />
          <AvatarFallback className="bg-secondary text-secondary-foreground font-bold">
            {getInitials(userProfile.name)}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

export function ChatInterface() {
  const { userProfile, user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
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
    
  // Add initial message if there are no messages for today
  useEffect(() => {
    if (!messagesLoading && messages?.length === 0 && user && userProfile && db) {
      const welcomeMessage = `Hallo ${userProfile.name}! Ik ben Broos, je persoonlijke buddy. Hoe gaat het met je?`;
      addDoc(
        collection(db, "users", user.uid, "chats", today, "messages"),
        {
          role: "assistant",
          content: welcomeMessage,
          timestamp: serverTimestamp(),
        }
      );
    }
  }, [messagesLoading, messages, user, userProfile, db, today]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !userProfile || !user || !db) return;

    const userMessageContent = input;
    setInput("");
    
    // Immediately save user message to Firestore
    await addDoc(collection(db, "users", user.uid, "chats", today, "messages"), {
      role: "user",
      content: userMessageContent,
      timestamp: serverTimestamp(),
    });

    setIsLoading(true);

    try {
      const chatHistory = (messages || [])
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
        
      const agentResponse = messages && messages.length > 0 ? messages[messages.length - 1].content : '';

      const { adaptedResponse, scores, alerts } = await chatWithBuddy({
        buddyName: "Broos",
        userName: userProfile.name,
        userAge: userProfile.birthDate
          ? new Date().getFullYear() -
            new Date(userProfile.birthDate).getFullYear()
          : 18,
        userMessage: userMessageContent,
        chatHistory: chatHistory,
        agentResponse: agentResponse,
      });

      // Save assistant message to Firestore
      await addDoc(
        collection(db, "users", user.uid, "chats", today, "messages"),
        {
          role: "assistant",
          content: adaptedResponse,
          timestamp: serverTimestamp(),
        }
      );

      if (scores && Object.keys(scores).length > 0) {
        await saveWellnessScores({
          db,
          userId: user.uid,
          scores,
          summary: adaptedResponse,
        });
      }
      
      if (alerts && alerts.length > 0) {
        for (const alert of alerts) {
          await saveAlert({ db, userId: user.uid, alert });
        }
      }

    } catch (error) {
      console.error("Error chatting with buddy:", error);
      toast({
        variant: "destructive",
        title: "Oh nee!",
        description:
          "Er is iets misgegaan bij het praten met Broos. Probeer het opnieuw.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!userProfile || messagesLoading) {
    return (
      <div className="flex-grow flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-grow" ref={scrollAreaRef}>
        <div className="px-4">
          {messages && messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="flex items-start gap-3 my-4 justify-start">
              <Avatar className="h-10 w-10 border-2 border-primary">
                <AvatarFallback>
                  <Logo size="normal" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl rounded-tl-none px-4 py-3 shadow-clay-card flex items-center gap-2">
                <Spinner size="small" />
                <span className="text-muted-foreground italic">
                  Broos denkt na...
                </span>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Typ je bericht..."
            autoComplete="off"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
          >
            <SendHorizonal className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
