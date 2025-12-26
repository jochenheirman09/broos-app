
"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import {
  useUser as useFirebaseUser,
  useFirestore,
  useAuth,
  useDoc,
  useMemoFirebase,
} from "@/firebase";
import type { UserProfile } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";
import { Logo } from "@/components/app/logo";
import { Wordmark } from "@/components/app/wordmark";
import { useRequestNotificationPermission } from "@/lib/firebase/messaging";

interface UserContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => void;
  forceRefetch: () => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  userProfile: null,
  loading: true,
  logout: async () => {},
  forceRefetch: () => {},
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
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [claimsReady, setClaimsReady] = useState(false);

  // Get the token refresh function from our custom hook.
  const { requestPermission: refreshToken } = useRequestNotificationPermission();

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
          await user.getIdToken(true);
          console.log("[UserProvider] Token refreshed in background.");
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

  // Effect to silently update the FCM token on app load if permission is granted.
  useEffect(() => {
    const autoRefreshToken = async () => {
      // Wait for user profile and ensure we are in a browser
      if (!userProfile?.uid || typeof window === 'undefined') return;

      if ('serviceWorker' in navigator) {
        try {
          // Wait for the Service Worker to be ready
          await navigator.serviceWorker.ready;
          
          // Small delay (500ms) to ensure everything is stable
          setTimeout(() => {
            // The refreshToken function (from useRequestNotificationPermission)
            // now handles the logic of checking permission and getting the token.
            // Pass `true` to indicate a silent refresh.
            console.log('[UserProvider] Attempting to silently update FCM token.');
            refreshToken(true); 
          }, 500); 

        } catch (swErr) {
          console.error("Service Worker not ready for auto-refresh:", swErr);
        }
      }
    };

    autoRefreshToken();
  }, [userProfile?.uid, refreshToken]);


  const loading = isAuthLoading || (!!user && (isProfileLoading || !claimsReady || !!profileError));

  useEffect(() => {
    if (loading) {
      return;
    }

    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname === '/' || pathname.startsWith('/verify-email');

    if (!user) {
      if (!isAuthPage) {
        router.replace("/login");
      }
      return;
    }

    if (isAuthPage && user.emailVerified) {
       router.replace('/dashboard');
    }

    if (!user.emailVerified) {
      if (pathname !== '/verify-email') {
        router.replace("/verify-email");
      }
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
    await auth.signOut();
    router.push("/");
    setIsLoggingOut(false);
  };

  const forceRefetchUser = useCallback(() => {
    forceRefetch();
  }, [forceRefetch]);


  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <UserContext.Provider
      value={{
        user,
        userProfile: userProfile as UserProfile | null,
        loading,
        logout,
        forceRefetch: forceRefetchUser
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
