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
    label: "Ik ben clubverantwoordelijke",
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

  if (loading) {
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
  
  if (user) {
    return (
       <div className="flex h-screen w-full items-center justify-center">
         <Spinner size="large" />
       </div>
     );
  }


  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center justify-center mb-8">
          <Wordmark size="large" />
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
                  className="w-full justify-start text-base !py-6 border-2 group hover:bg-transparent"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                  <div className="relative flex items-center">
                    <span className="text-primary group-hover:text-primary-foreground transition-colors">
                      {icon}
                    </span>
                    <span className="group-hover:text-primary-foreground transition-colors">
                      {label}
                    </span>
                  </div>
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
