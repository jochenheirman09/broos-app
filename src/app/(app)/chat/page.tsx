
"use client";

import { ChatInterface } from "@/components/app/chat-interface";

export default function ChatPage() {
  // The layout of this page is now controlled by flexbox within ChatInterface and its parent layout.
  // The 'h-full' and 'flex' properties are crucial for the chat window to expand.
  return (
    <div className="flex flex-col flex-grow h-full">
        <ChatInterface />
    </div>
  );
}
