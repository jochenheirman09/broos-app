
'use client';

import {
  LayoutGrid,
  MessageSquare,
  Archive,
  User,
  Info,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Wordmark } from "./wordmark";
import { useUser } from "@/context/user-context";
import { Button } from "../ui/button";
import { Logo } from "./logo";
import { ThemeToggle } from "../theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useState } from "react";
import { ProfileSheet } from "./profile-sheet";

const navItems = [
  { href: "/dashboard", icon: LayoutGrid, label: "Dashboard" },
  { href: "/chat", icon: MessageSquare, label: "Chat" },
  { href: "/archive", icon: Archive, label: "Archief" },
  { href: "/p2p-chat", icon: Users, label: "Team" },
];

export function PlayerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
              {userProfile && (
                 <Button
                  variant="ghost"
                  className="relative h-11 w-11 rounded-full"
                  onClick={() => setIsProfileSheetOpen(true)}
                >
                  <Avatar className="h-11 w-11 border-2 border-primary/50">
                    <AvatarImage src={userProfile.photoURL} />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold text-sm">
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

        <main className="flex-1 pb-24">{children}</main>

        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto grid h-20 max-w-lg grid-cols-4 items-center justify-items-center text-sm">
            {navItems.map(({ href, icon: Icon, label }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors w-20",
                    isActive
                      ? "text-primary font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
      <ProfileSheet isOpen={isProfileSheetOpen} onOpenChange={setIsProfileSheetOpen} />
    </>
  );
}
