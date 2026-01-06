
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
    // This effect ensures the PWA service worker (for offline caching) is registered.
    // It is now separate from the Firebase worker.
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && (window as any).workbox !== undefined) {
      const wb = (window as any).workbox;
      
      const promptNewVersionAvailable = () => {
         // Reloads the page to apply the update.
         window.location.reload();
      };

      wb.addEventListener('controlling', () => {
         promptNewVersionAvailable();
      });

      wb.addEventListener('waiting', () => {
        wb.messageSkipWaiting();
      });
      
      // Registers the PWA service worker (sw.js)
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
