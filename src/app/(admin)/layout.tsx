"use client";

import { useUser } from "@/context/user-context";
import { Wordmark } from "@/components/app/wordmark";
import { Spinner } from "@/components/ui/spinner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Toaster } from "@/components/ui/toaster";

// Fallback emails for local development if the environment variable is not set.
// In production, the value from Google Secret Manager will be used.
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "jochen.heirman@gmail.com,nilsvanbever@gmail.com").split(',').map(e => e.trim());

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useUser();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="large" />
      </div>
    );
  }

  // Check if the user is one of the designated admins.
  const isAuthorized = user && user.email && ADMIN_EMAILS.includes(user.email);

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
             <div className="container mx-auto flex h-20 items-center justify-between px-4">
                 <Link href="/admin/dashboard">
                    <Wordmark size="normal">Broos 2.0 - Admin</Wordmark>
                 </Link>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    {isAuthorized && (
                        <Button variant="ghost" size="sm" onClick={logout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Uitloggen
                        </Button>
                    )}
                </div>
            </div>
        </header>
        <main className="container mx-auto flex-1 py-8 px-4">
            {isAuthorized ? children : (
                <div className="flex h-full items-center justify-center">
                    <Alert variant="destructive" className="max-w-lg">
                        <ShieldAlert className="h-4 w-4" />
                        <AlertTitle>Geen Toegang</AlertTitle>
                        <AlertDescription>
                            Je hebt geen rechten om deze pagina te bekijken. Deze sectie is alleen voor applicatiebeheerders.
                            <div className="mt-4">
                                <Link href="/dashboard">
                                    <Button variant="outline">Terug naar Dashboard</Button>
                                </Link>
                            </div>
                        </AlertDescription>
                    </Alert>
                </div>
            )}
        </main>
        <Toaster />
    </div>
  );
}
