"use client";

import { JoinClubForm } from "@/components/app/join-club-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Users, Wrench } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { handleRepairUserClaims } from "@/actions/cleanup-actions";
import { useUser } from "@/context/user-context";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { useRouter } from "next/navigation";

// New component for the repair functionality
function RepairCard() {
    const { user, logout } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const onRepair = async () => {
        if (!user) {
            toast({ variant: "destructive", title: "Fout", description: "U bent niet ingelogd."});
            return;
        }
        setIsLoading(true);
        try {
            const result = await handleRepairUserClaims(user.uid);
            if (result.success) {
                toast({
                    title: "Account Hersteld!",
                    description: `${result.message} U wordt nu uitgelogd.`,
                });
                // Force an immediate logout to get a new token.
                await logout();
                router.push('/login');
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Herstellen Mislukt",
                description: error.message || "Er is een onbekende fout opgetreden.",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card className="mt-8 border-accent">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-accent-foreground">
                    <Wrench className="h-6 w-6" />
                    Problemen met Inloggen?
                </CardTitle>
                <CardDescription>
                    Als u na het aanmaken van een club of het joinen van een team nog steeds fouten ziet, klik dan hier om uw account te herstellen.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button onClick={onRepair} variant="accent" className="w-full" disabled={isLoading}>
                    {isLoading && <Spinner size="small" className="mr-2" />}
                    Herstel Mijn Account
                </Button>
            </CardContent>
        </Card>
    )
}

export default function JoinClubPage() {
  return (
    <div className="flex justify-center items-start pt-8">
      <div className="w-full max-w-lg">
        <Card>
          <CardHeader>
            <div className="flex items-center mb-4">
              <Users className="h-8 w-8 mr-3 text-primary" />
              <div>
                <CardTitle className="text-2xl">Sluit je aan bij een Club</CardTitle>
                <CardDescription>
                  Voer de unieke uitnodigingscode van de club in.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <JoinClubForm />
          </CardContent>
        </Card>
        <RepairCard />
      </div>
    </div>
  );
}
