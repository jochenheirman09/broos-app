
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import {
  useUser as useFirebaseUser,
  useAuth,
  useDoc,
  useFirestore,
  useMemoFirebase,
  FirebaseErrorListener, // Import the listener
} from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
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
  const pathname = usePathname();

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

  // The context is loading if Firebase Auth is checking the user OR if we have a user
  // but are still waiting for their Firestore profile. This is the source of truth.
  const loading = isAuthLoading || (!!user && isProfileLoading);
  
  useEffect(() => {
    if (loading) {
      console.log('[UserProvider] Context is loading...');
      return;
    }

    // --- Start of Centralized Routing Logic ---
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname === '/' || pathname.startsWith('/verify-email');

    if (!user) {
      // If not logged in, should be on an auth page. If not, redirect.
      if (!isAuthPage) {
        console.log('[UserProvider] No user, redirecting to /login.');
        router.replace("/login");
      }
      return;
    }
    
    // User is logged in, but might be on an auth page they shouldn't be on.
    if (isAuthPage && user.emailVerified) {
       console.log('[UserProvider] User is logged in and verified, redirecting from auth page to /dashboard.');
       router.replace('/dashboard');
    }

    if (!user.emailVerified) {
      if (pathname !== '/verify-email') {
        console.log('[UserProvider] User not verified, redirecting to /verify-email.');
        router.replace("/verify-email");
      }
      return;
    }

    if (userProfile) {
      const isPlayerStaffProfileIncomplete = (userProfile.role === 'player' || userProfile.role === 'staff') && (!userProfile.teamId || !userProfile.birthDate);
      
      if (isPlayerStaffProfileIncomplete && pathname !== '/complete-profile') {
        console.log('[UserProvider] Player/Staff profile incomplete, redirecting to /complete-profile.');
        router.replace('/complete-profile');
      } else if (!isPlayerStaffProfileIncomplete && pathname === '/complete-profile') {
         console.log('[UserProvider] Player/Staff profile is complete, redirecting to /dashboard.');
        router.replace('/dashboard');
      }
    }
    // --- End of Centralized Routing Logic ---

  }, [user, userProfile, loading, router, pathname]);


  useEffect(() => {
    if (profileError) {
      console.error("[UserProvider] Error fetching user profile:", profileError);
    }
  }, [profileError]);

  // DATA SYNC FIX: Ensure emailVerified status in Firestore matches Auth state.
  useEffect(() => {
    if (user && user.emailVerified && userProfile && !userProfile.emailVerified) {
      console.log(`[UserProvider] Syncing emailVerified status for user ${user.uid}...`);
      const userRef = doc(firestore, "users", user.uid);
      updateDoc(userRef, { emailVerified: true })
        .then(() => console.log(`[UserProvider] Firestore emailVerified status updated for ${user.uid}.`))
        .catch(err => console.error(`[UserProvider] Failed to sync emailVerified status:`, err));
    }
  }, [user, userProfile, firestore]);

  const logout = async () => {
    setIsLoggingOut(true);
    await auth.signOut();
    router.push("/");
    setIsLoggingOut(false);
  };

  if (loading || isLoggingOut) {
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
  
  return (
    <UserContext.Provider
      value={{
        user,
        userProfile: userProfile as UserProfile | null,
        loading,
        logout,
      }}
    >
      <FirebaseErrorListener />
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
