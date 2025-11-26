
"use client";

import Link from "next/link";
import { User, Users, Shield } from "lucide-react";
import { Wordmark } from "@/components/app/wordmark";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser } from "@/context/user-context";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { Logo } from "@/components/app/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const roles = [
  {
    role: "player",
    label: "Ik ben een speler",
    icon: <User className="h-5 w-5 mr-3" />,
  },
  {
    role: "staff",
    label: "Ik ben lid van een staf",
    icon: <Users className="h-5 w-5 mr-3" />,
  },
  {
    role: "responsible",
    label: "Ik ben clubbeheerder",
    icon: <Shield className="h-5 w-5 mr-3" />,
  },
];

export default function RoleSelectionPage() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || user) {
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
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8 gap-2">
          <Logo size="large" />
          <Wordmark size="large">Broos 2.0</Wordmark>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Welkom! Wie ben jij?</CardTitle>
            <CardDescription>
              Selecteer je rol om door te gaan.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {roles.map(({ role, label, icon }) => (
              <Link key={role} href={`/register?role=${role}`} passHref>
                <Button
                  variant="outline"
                  className="w-full justify-start text-base !py-6 border-0 btn-gradient-border hover:bg-accent hover:text-accent-foreground"
                >
                  <span className="text-primary">{icon}</span>
                  <span>{label}</span>
                </Button>
              </Link>
            ))}
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Heb je al een account?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary hover:underline"
              >
                Log in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
