
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
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [claimsReady, setClaimsReady] = useState(false);

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
          // Force refresh the ID token to get the latest custom claims
          const tokenResult = await getIdTokenResult(user, true);
          console.log("[UserProvider] Token refreshed. Claims:", tokenResult.claims);
          setClaimsReady(true);
        } catch (error) {
           console.error("[UserProvider] Failed to refresh token:", error);
           setClaimsReady(true); // Proceed even if refresh fails, might be offline
        }
      }
    };

    if (!isAuthLoading && user) {
      syncClaims();
    } else if (!isAuthLoading && !user) {
      setClaimsReady(true); // No user, so no claims to wait for
    }
  }, [user, isAuthLoading]);

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
