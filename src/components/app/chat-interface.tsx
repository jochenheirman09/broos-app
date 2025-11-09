"use client";

import { useState, useRef, useEffect } from "react";
import { useUser } from "@/context/user-context";
import { useFirestore } from "@/firebase";
import { chatWithBuddy } from "@/ai/flows/buddy-flow";
import { saveWellnessScores } from "@/lib/wellness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SendHorizonal, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Logo } from "./logo";
import { Spinner } from "../ui/spinner";

function ChatMessage({ message }: { message: ChatMessageType }) {
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

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Automatically scroll to the bottom when messages change
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  useEffect(() => {
    // Send a welcome message from the buddy on initial load
    if (userProfile && messages.length === 0) {
      setMessages([
        {
          id: "initial-1",
          role: "assistant",
          content: `Hallo ${userProfile.name}! Ik ben Broos, je persoonlijke buddy. Hoe voel je je vandaag?`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [userProfile, messages.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !userProfile || !user) return;

    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const chatHistory = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      const agentResponse = messages.length > 0 ? messages[messages.length - 1].content : '';
      
      const { adaptedResponse, scores } = await chatWithBuddy({
        buddyName: "Broos",
        userName: userProfile.name,
        userAge: userProfile.birthDate
          ? new Date().getFullYear() - new Date(userProfile.birthDate).getFullYear()
          : 18,
        userMessage: input,
        chatHistory: chatHistory,
        agentResponse: agentResponse,
      });

      const assistantMessage: ChatMessageType = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: adaptedResponse,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Save scores to Firestore if any were returned
      if (scores && Object.keys(scores).length > 0) {
        await saveWellnessScores({
          db,
          userId: user.uid,
          scores,
          summary: adaptedResponse,
        });
      }

    } catch (error) {
      console.error("Error chatting with buddy:", error);
      toast({
        variant: "destructive",
        title: "Oh nee!",
        description:
          "Er is iets misgegaan bij het praten met Broos. Probeer het opnieuw.",
      });
      // Optionally remove the user's message if the call fails
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!userProfile) {
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
          {messages.map((message) => (
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
                <span className="text-muted-foreground italic">Broos denkt na...</span>
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
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <SendHorizonal className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
