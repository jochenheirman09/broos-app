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

  const loading = isAuthLoading || isProfileLoading;

  useEffect(() => {
    if (!loading && !user) {
      // If not loading and no user, we are logged out.
      // No need to redirect here, the app layout will handle it.
    }
    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      // Handle profile fetching error, e.g., logout or show an error message
    }
  }, [user, loading, profileError]);

  const logout = async () => {
    setIsLoggingOut(true);
    await auth.signOut();
    // No need to clear state manually, the auth listener will do it.
    router.push("/");
    setIsLoggingOut(false);
  };

  if (loading || isLoggingOut) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center justify-center gap-4">
          <Logo size="large" />
          <Wordmark size="large" />
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
