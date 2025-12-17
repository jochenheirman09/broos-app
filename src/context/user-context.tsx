
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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
  
  // State to explicitly track if we have forced a token refresh for custom claims.
  const [isTokenRefreshed, setIsTokenRefreshed] = useState(false);

  // The context is loading if auth is checking, or we're fetching the profile, or we are waiting for the critical token refresh.
  const loading = isAuthLoading || (!!user && (isProfileLoading || !isTokenRefreshed));
  
  useEffect(() => {
    if (isAuthLoading) {
      console.log('[UserProvider] Auth state is loading...');
      return;
    }
    
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register') || pathname === '/' || pathname.startsWith('/verify-email');
    
    if (!user) {
        // Not logged in. Reset token state for next login.
        setIsTokenRefreshed(false); 
        if (!isAuthPage) {
            console.log('[UserProvider] No user, redirecting to /login.');
            router.replace("/login");
        }
        return;
    }

    // User object exists. Now we handle token refresh and routing.
    // If token hasn't been refreshed for this session, do it now.
    if (!isTokenRefreshed) {
        console.log('[UserProvider] User found, forcing token refresh for custom claims...');
        user.getIdToken(true).then(() => {
            console.log('[UserProvider] Token refreshed successfully. Claims are now available on the client.');
            setIsTokenRefreshed(true); // This will trigger a re-render, and `loading` will become false.
        }).catch(err => {
            console.error("[UserProvider] CRITICAL: Failed to refresh token. Logging out.", err);
            logout();
        });
        return; // IMPORTANT: Wait for the refresh to complete before proceeding.
    }
    
    // Once the token is refreshed, proceed with routing logic.
    // This block will only run AFTER isTokenRefreshed is true.
    if (!user.emailVerified) {
      if (pathname !== '/verify-email') {
        console.log('[UserProvider] User not verified, redirecting to /verify-email.');
        router.replace("/verify-email");
      }
      return;
    }

    if (isAuthPage) {
       console.log('[UserProvider] User is logged in and verified, redirecting from auth page to /dashboard.');
       router.replace('/dashboard');
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

  }, [user, userProfile, isAuthLoading, isTokenRefreshed, router, pathname]);


  useEffect(() => {
    if (profileError) {
      console.error("[UserProvider] Error fetching user profile:", profileError);
    }
  }, [profileError]);

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
    // Resetting states on logout
    setIsTokenRefreshed(false); 
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
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
