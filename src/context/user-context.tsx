
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User as FirebaseUser, getIdTokenResult } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import {
  useUser as useFirebaseUser,
  useFirestore,
  useAuth,
  useDoc,
  useMemoFirebase,
  useFirebaseApp,
} from "@/firebase";
import type { UserProfile } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";
import { Logo } from "@/components/app/logo";
import { Wordmark } from "@/components/app/wordmark";
import { useRequestNotificationPermission } from "@/lib/firebase/messaging";
import { getMessaging, getToken, deleteToken } from "firebase/messaging";


interface UserContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => void;
  forceRefetch: () => void;
  isUserLoading: boolean; // Exposing auth loading state
}

const UserContext = createContext<UserContextType>({
  user: null,
  userProfile: null,
  loading: true,
  logout: async () => {},
  forceRefetch: () => {},
  isUserLoading: true,
});

const LoadingScreen = () => (
  <div className="flex h-screen w-full items-center justify-center bg-background">
    <div className="flex flex-col items-center justify-center gap-4">
      <Logo size="large" showBackground={true} />
      <Wordmark size="large">Broos 2.0</Wordmark>
      <Spinner size="medium" className="mt-4" />
    </div>
  </div>
);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isUserLoading: isAuthLoading } = useFirebaseUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const app = useFirebaseApp();
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [claimsReady, setClaimsReady] = useState(false);
  const { requestPermission } = useRequestNotificationPermission();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, "users", user.uid) : null),
    [user, firestore]
  );

  const {
    data: userProfile,
    isLoading: isProfileLoading,
    error: profileError,
    forceRefetch
  } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    const syncClaims = async () => {
      if (user) {
        try {
          const tokenResult = await getIdTokenResult(user, true);
          console.log("[UserProvider] Token refreshed. Claims:", tokenResult.claims);
          setClaimsReady(true);
        } catch (error) {
           console.error("[UserProvider] Failed to refresh token:", error);
           setClaimsReady(true);
        }
      }
    };

    if (!isAuthLoading && user) {
      syncClaims();
    } else if (!isAuthLoading && !user) {
      setClaimsReady(true);
    }
  }, [user, isAuthLoading]);

  // Automatic silent sync and background refresh listener
  useEffect(() => {
    const silentSync = () => {
      console.log("👁️ [Visibility Sync Effect] Triggered.");
      if (user) {
        requestPermission(user, false);
      } else {
        console.log("👁️ [Visibility Sync Effect] Skipping: no user.");
      }
    };
    
    const initialSyncTimeout = setTimeout(() => {
      console.log("👁️ [Visibility Sync Effect] Initializing with a 2s delay.");
      silentSync();
    }, 2000);

    window.addEventListener('visibilitychange', silentSync);
    window.addEventListener('focus', silentSync);

    return () => {
      clearTimeout(initialSyncTimeout);
      window.removeEventListener('visibilitychange', silentSync);
      window.removeEventListener('focus', silentSync);
    };
  }, [user, requestPermission]);


  const loading = isAuthLoading || (!!user && (isProfileLoading || !claimsReady));

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname === '/' || pathname.startsWith('/verify-email');

    if (!user) {
      if (!isAuthPage) router.replace("/login");
      return;
    }

    if (isAuthPage && user.emailVerified) {
       router.replace('/dashboard');
    }

    if (!user.emailVerified) {
      if (pathname !== '/verify-email') router.replace("/verify-email");
      return;
    }

    if (userProfile) {
      const isPlayerStaffProfileIncomplete = (userProfile.role === 'player' || userProfile.role === 'staff') && !userProfile.teamId;

      if (isPlayerStaffProfileIncomplete && pathname !== '/complete-profile') {
        router.replace('/complete-profile');
      } else if (!isPlayerStaffProfileIncomplete && pathname === '/complete-profile') {
        router.replace('/dashboard');
      }
    } else if (!isProfileLoading && user && !userProfile) {
        console.error("[UserProvider] Profile definitively missing from Firestore for UID:", user.uid);
    }
    
  }, [user, userProfile, loading, router, pathname, isProfileLoading]);

  useEffect(() => {
    if (user && user.emailVerified && userProfile && !userProfile.emailVerified) {
      const userRef = doc(firestore, "users", user.uid);
      updateDoc(userRef, { emailVerified: true });
    }
  }, [user, userProfile, firestore]);
  
  const logout = async () => {
    setIsLoggingOut(true);
    setClaimsReady(false);
    
    // --- New Logout Logic ---
    const logPrefix = `[Logout] User: ${user?.uid} |`;
    if (user && 'Notification' in window && Notification.permission === 'granted') {
      try {
        console.log(`${logPrefix} Attempting to get current token to disassociate.`);
        const messaging = getMessaging(app);
        const currentToken = await getToken(messaging, {
            vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        if (currentToken) {
          console.log(`${logPrefix} Found token. Sending to remove endpoint...`);
          // Fire-and-forget the removal call. Don't block logout if this fails.
          fetch('/api/remove-fcm-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.uid, token: currentToken }),
          }).catch(err => console.error(`${logPrefix} Failed to send token for removal:`, err));

          // Also delete the token from the client instance to be safe
          await deleteToken(messaging);
          console.log(`${logPrefix} Client token instance deleted.`);
        } else {
            console.log(`${logPrefix} No token found on client, nothing to remove.`);
        }
      } catch (error) {
        console.error(`${logPrefix} Error disassociating FCM token:`, error);
      }
    }
    // --- End New Logout Logic ---
    
    await auth.signOut();
    router.push("/");
    setIsLoggingOut(false);
  };


  const forceRefetchUser = useCallback(() => {
    forceRefetch();
  }, [forceRefetch]);

  if (loading || isLoggingOut) {
    return <LoadingScreen />;
  }

  return (
    <UserContext.Provider
      value={{
        user,
        userProfile: userProfile as UserProfile | null,
        loading,
        logout,
        forceRefetch: forceRefetchUser,
        isUserLoading: isAuthLoading
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
