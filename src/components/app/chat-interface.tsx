

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useUser } from "@/context/user-context";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase/client-provider";
import { chatWithBuddy, BuddyOutput } from "@/ai/flows/buddy-flow";
import { saveWellnessScores, saveAlert } from "@/lib/firebase/firestore/wellness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollViewport } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  doc,
  setDoc,
  Firestore,
} from "firebase/firestore";
import { format } from "date-fns";
import Link from "next/link";
import { BuddyAvatar } from "./buddy-avatar";
import { updateUserProfile } from "@/lib/firebase/firestore/user";

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
        <Link href="/buddy-profile">
          <BuddyAvatar className="h-10 w-10 border-2 border-primary" />
        </Link>
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
        <Link href="/profile">
          <Avatar className="h-10 w-10 border-2 border-secondary">
            <AvatarImage src={userProfile.photoURL} />
            <AvatarFallback className="bg-secondary text-secondary-foreground font-bold">
              {getInitials(userProfile.name)}
            </AvatarFallback>
          </Avatar>
        </Link>
      )}
    </div>
  );
}

// Helper function to create/update the parent Chat document
async function saveChatSummary(
  db: Firestore,
  userId: string,
  date: string,
  summary: string
) {
  const chatDocRef = doc(db, "users", userId, "chats", date);
  const chatData = {
    id: date,
    userId: userId,
    date: date,
    summary: summary,
    updatedAt: serverTimestamp(),
  };
  // Use setDoc with merge to create or update the summary (non-blocking)
  setDoc(chatDocRef, chatData, { merge: true });
}

export function ChatInterface() {
  const { userProfile, user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  
  const buddyName = userProfile?.buddyName || "Broos";
  const firstName = userProfile?.name?.split(" ")[0];

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
    
  const addAssistantMessage = useCallback(async (content: string) => {
    if (!user || !db) return;
     addDoc(
        collection(db, "users", user.uid, "chats", today, "messages"),
        {
            role: "assistant",
            content: content,
            timestamp: serverTimestamp(),
        }
    );
  }, [user, db, today]);

  const handleInitialMessage = useCallback(async () => {
    if (!userProfile || !user || !db || !firstName) return;
    
    setIsLoading(true);
    try {
        const { adaptedResponse, playerInfo, onboardingCompleted } = await chatWithBuddy({
            buddyName: buddyName,
            userName: firstName,
            userAge: userProfile.birthDate
                ? new Date().getFullYear() - new Date(userProfile.birthDate).getFullYear()
                : 18,
            userGender: userProfile.gender || 'male',
            userMessage: '', 
            chatHistory: '', 
            onboardingCompleted: !!userProfile.onboardingCompleted,
        });

        await addAssistantMessage(adaptedResponse);
        saveChatSummary(db, user.uid, today, adaptedResponse);

        const updates: any = {};
        if (playerInfo) {
            Object.assign(updates, playerInfo);
        }
        if (onboardingCompleted) {
            updates.onboardingCompleted = true;
        }

        if(Object.keys(updates).length > 0) {
            await updateUserProfile({ db, userId: user.uid, data: updates });
        }

    } catch (error) {
        toast({
            variant: "destructive",
            title: "Oh nee!",
            description: "Kon het gesprek niet starten. Probeer het opnieuw.",
        });
    } finally {
        setIsLoading(false);
    }
  }, [userProfile, user, db, firstName, buddyName, today, addAssistantMessage, toast]);

  useEffect(() => {
    if (!messagesLoading && messages?.length === 0) {
      handleInitialMessage();
    }
  }, [messagesLoading, messages, handleInitialMessage]);

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

    addDoc(
      collection(db, "users", user.uid, "chats", today, "messages"),
      {
        role: "user",
        content: userMessageContent,
        timestamp: serverTimestamp(),
      }
    );

    setIsLoading(true);

    try {
      const chatHistory = (messages || [])
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
      const agentResponse = messages && messages.length > 0 ? messages[messages.length - 1].content : "";

      const { adaptedResponse, scores, alerts, playerInfo, onboardingCompleted } = await chatWithBuddy({
        buddyName: buddyName,
        userName: firstName,
        userAge: userProfile.birthDate ? new Date().getFullYear() - new Date(userProfile.birthDate).getFullYear() : 18,
        userGender: userProfile.gender || 'male',
        userMessage: userMessageContent,
        chatHistory: chatHistory,
        agentResponse: agentResponse,
        onboardingCompleted: !!userProfile.onboardingCompleted,
      });

      addAssistantMessage(adaptedResponse);
      
      saveChatSummary(db, user.uid, today, adaptedResponse);
      const updates: any = {};
      if (playerInfo) Object.assign(updates, playerInfo);
      if (onboardingCompleted && !userProfile.onboardingCompleted) updates.onboardingCompleted = true;
      if (Object.keys(updates).length > 0) await updateUserProfile({ db, userId: user.uid, data: updates });
      if (scores && Object.keys(scores).length > 0) saveWellnessScores({ db, userId: user.uid, scores, summary: adaptedResponse });
      if (alerts && alerts.length > 0) {
        for (const alert of alerts) {
          saveAlert({ db, userId: user.uid, alert });
        }
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Oh nee!",
        description: "Er is iets misgegaan. Je bericht is niet verzonden, probeer het opnieuw.",
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
  );
}
