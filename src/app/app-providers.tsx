"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseClientProvider } from "@/firebase";
import { UserProvider } from "@/context/user-context";
import { Toaster } from "@/components/ui/toaster";
import { ForegroundMessageListener } from "@/lib/firebase/messaging";
import { useEffect } from "react";

// This is the new Client Component that wraps all providers and client-side hooks.
export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && (window as any).workbox !== undefined) {
      const wb = (window as any).workbox;
      
      const promptNewVersionAvailable = () => {
         window.location.reload();
      };

      // Listener for when the new service worker has taken control.
      wb.addEventListener('controlling', () => {
         promptNewVersionAvailable();
      });

      // Listener for when a new service worker is waiting to be activated.
      wb.addEventListener('waiting', () => {
        // Send a message to the waiting service worker to skip waiting.
        // This will trigger the 'controlling' event on the new service worker.
        wb.messageSkipWaiting();
      });
      
      // Register the service worker.
      wb.register();
    }
  }, []);

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <FirebaseClientProvider>
        <UserProvider>
          {children}
          <ForegroundMessageListener />
          <Toaster />
        </UserProvider>
      </FirebaseClientProvider>
    </ThemeProvider>
  );
}
