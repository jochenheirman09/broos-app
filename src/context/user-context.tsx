
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
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

interface UserContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  userProfile: null,
  loading: true,
  logout: async () => {},
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isUserLoading: isAuthLoading } = useFirebaseUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();

  const userDocRef = useMemoFirebase(
    () => (user ? doc(firestore, "users", user.uid) : null),
    [user, firestore]
  );

  const {
    data: userProfile,
    isLoading: isProfileLoading,
    error: profileError,
  } = useDoc<UserProfile>(userDocRef);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // SIMPLIFIED LOADING LOGIC:
  // The context is loading if Firebase Auth is checking the user, OR
  // if we have a user but are still waiting for their Firestore profile to load.
  const loading = isAuthLoading || (!!user && isProfileLoading);
  
  useEffect(() => {
    console.log('[UserProvider] State Change:', {
      loading,
      isAuthLoading,
      isProfileLoading,
      hasUser: !!user,
      hasProfile: !!userProfile,
      isVerified: user?.emailVerified,
    });
  }, [user, userProfile, loading, isAuthLoading, isProfileLoading]);


  useEffect(() => {
    if (profileError) {
      console.error("[UserProvider] Error fetching user profile:", profileError);
    }
  }, [profileError]);

  const logout = async () => {
    setIsLoggingOut(true);
    await auth.signOut();
    router.push("/");
    setIsLoggingOut(false);
  };

  // The global loading screen for the initial app load or logout.
  // The AppLayout will handle its own loading state for internal navigation.
  if (loading || isLoggingOut) {
     if (isAuthLoading) {
        // This is the very initial, full-screen loader.
        console.log('[UserProvider] Rendering global loading spinner.');
        return (
          <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center justify-center gap-4">
              <Logo size="large" />
              <Wordmark size="large">Broos 2.0</Wordmark>
              <Spinner size="medium" className="mt-4" />
            </div>
          </div>
        );
     }
  }
  
  console.log('[UserProvider] Loading complete, rendering children.');
  return (
    <UserContext.Provider
      value={{
        user,
        userProfile: userProfile as UserProfile | null,
        loading,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
