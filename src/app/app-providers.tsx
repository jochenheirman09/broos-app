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
    // This effect ensures the PWA service worker (for offline caching) is registered.
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator 
    ) {
      const wb = (window as any).workbox;
      if (wb) {
         wb.addEventListener('waiting', () => {
          console.log('[PWA] A new version is available. Activating...');
          wb.messageSkipWaiting();
        });

        wb.addEventListener('controlling', () => {
          console.log('[PWA] New service worker has taken control. Reloading page.');
          window.location.reload();
        });
        
        wb.register();
        console.log('[PWA] Service worker registered by workbox.');
      }
      
      // CRITICAL FIX: Send Firebase config to the Service Worker after it's ready.
      navigator.serviceWorker.ready.then((registration) => {
        console.log('[AppProviders] Service Worker is ready. Posting FIREBASE_CONFIG.');
        registration.active?.postMessage({
          type: 'FIREBASE_CONFIG',
          firebaseConfig: firebaseConfig
        });
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
