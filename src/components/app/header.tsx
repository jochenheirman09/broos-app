
"use client";

import { useUser } from "@/context/user-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "../theme-toggle";
import { Logo } from "./logo";
import { Wordmark } from "./wordmark";
import Link from "next/link";
import { User, Info, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { ProfileSheet } from "./profile-sheet";

export function AppHeader() {
  const { userProfile } = useUser();
  const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);

  const getInitials = (name: string = "") => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-20 items-center">
          <div className="mr-auto flex items-center space-x-3">
            <Link href="/dashboard" className="flex items-center space-x-3">
              <Logo />
              <Wordmark>Broos 2.0</Wordmark>
            </Link>
          </div>
          <div className="flex items-center space-x-2">
            <ThemeToggle />
            <Link href="/about">
              <Button variant="ghost" size="icon">
                <Info className="h-5 w-5" />
                <span className="sr-only">About</span>
              </Button>
            </Link>
            <Link href="/alerts">
              <Button variant="ghost" size="icon">
                <AlertTriangle className="h-5 w-5" />
                <span className="sr-only">Alerts</span>
              </Button>
            </Link>
            {userProfile && (
              <Button
                variant="ghost"
                className="relative h-12 w-12 rounded-full"
                onClick={() => setIsProfileSheetOpen(true)}
              >
                <Avatar className="h-12 w-12 border-2 border-primary/50">
                  <AvatarImage src={userProfile.photoURL} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {userProfile.name ? (
                      getInitials(userProfile.name)
                    ) : (
                      <User />
                    )}
                  </AvatarFallback>
                </Avatar>
              </Button>
            )}
          </div>
        </div>
      </header>
      <ProfileSheet isOpen={isProfileSheetOpen} onOpenChange={setIsProfileSheetOpen} />
    </>
  );
}
