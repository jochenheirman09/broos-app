
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { useRouter, usePathname } from "next/navigation";
import {
  useUser as useFirebaseUser,
  useAuth,
  useDoc,
  useFirestore,
  useMemoFirebase
} from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import type { UserProfile } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";
import { Logo } from "@/components/app/logo";
import { Wordmark } from "@/components/app/wordmark";

interface UserContextType {
  user: FirebaseUser | null;
  isUserLoading: boolean; // Renamed for clarity, represents auth state loading.
  logout: () => void;
  // userProfile is removed from here. It will be fetched by components that need it.
}

const UserContext = createContext<UserContextType>({
  user: null,
  isUserLoading: true,
  logout: async () => {},
});

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isUserLoading, userError } = useFirebaseUser();
  const auth = useAuth();
  const router = useRouter();
  
  // This state is now simplified to only handle logout.
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Effect to log auth errors if they occur during the initial check.
  useEffect(() => {
    if (userError) {
      console.error("[UserProvider] Auth state error:", userError);
    }
  }, [userError]);


  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await auth.signOut();
      // After sign-out, the `onAuthStateChanged` listener will update the `user` state to null.
      // We can then forcefully redirect to ensure the user lands on the login page.
      router.push("/login"); 
    } catch (error) {
       console.error("Logout failed:", error);
    } finally {
       setIsLoggingOut(false);
    }
  };

  // The main loading screen now only depends on the auth check and logout process.
  // It does NOT wait for the Firestore profile anymore.
  if (isUserLoading || isLoggingOut) {
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

  // The context now provides only the user object and its loading state.
  return (
    <UserContext.Provider
      value={{ user, isUserLoading, logout }}
    >
      {children}
    </UserContext.Provider>
  );
};

// This hook now returns a simpler object, without `userProfile`.
export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    // We can now also fetch the userProfile directly within the hook for convenience in components,
    // but the layout will handle the primary loading and redirection logic.
    const firestore = useFirestore();
    const userDocRef = useMemoFirebase(() => (context.user ? doc(firestore, 'users', context.user.uid) : null), [context.user, firestore]);
    const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

    return {
        user: context.user,
        isUserLoading: context.isUserLoading,
        userProfile,
        isProfileLoading,
        loading: context.isUserLoading || (!!context.user && isProfileLoading), // Corrected loading logic
        logout: context.logout,
    }
};
