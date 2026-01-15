"use client";

import { ChatInterface } from "@/components/app/chat-interface";

export default function ChatPage() {
  // Removed the container div. The ChatInterface component will now be a direct child
  // of the main layout, which handles padding and centering.
  return <ChatInterface />;
}
