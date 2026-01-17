
"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { FirebaseClientProvider, firebaseConfig } from "@/firebase";
import { UserProvider } from "@/context/user-context";
import { Toaster } from "@/components/ui/toaster";
import { ForegroundMessageListener } from "@/lib/firebase/messaging";
import { useEffect } from "react";

// This is the new Client Component that wraps all providers and client-side hooks.
export function AppProviders({ children }: { children: React.ReactNode }) {
  
  useEffect(() => {
    // This effect handles PWA service worker registration and updates.
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const wb = (window as any).workbox;

      if (wb) {
        // This listener is crucial. When a new SW is installed, it waits.
        // We receive this event and tell it to take over immediately.
        wb.addEventListener('waiting', () => {
          console.log('[PWA] A new service worker is waiting. Telling it to activate.');
          wb.messageSkipWaiting();
        });
        
        // Register the service worker. This also implicitly checks for updates.
        wb.register();
        console.log('[PWA] Service worker registered by workbox.');
      }

      // This is the core fix. When the new service worker finally takes control,
      // we force a page reload to get the latest client-side code and prevent
      // errors from mismatched server action IDs.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] Controller has changed. Reloading page to get latest version.');
        window.location.reload();
      });
      
      // CRITICAL: Send Firebase config to the Service Worker after it's ready.
      navigator.serviceWorker.ready.then((registration) => {
        console.log('[AppProviders] Service Worker is ready. Posting FIREBASE_CONFIG.');
        if (registration.active) {
            registration.active.postMessage({
                type: 'FIREBASE_CONFIG',
                firebaseConfig: firebaseConfig
            });
        }
      }).catch(err => console.error("Service Worker ready error:", err));
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
