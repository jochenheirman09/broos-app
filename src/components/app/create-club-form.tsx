
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/context/user-context";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "../ui/spinner";
import Link from "next/link";
import { Separator } from "../ui/separator";
import { useRouter } from "next/navigation";
import { createClub } from "@/lib/firebase/firestore/club"; // Gewijzigd: importeer de client-side functie
import { useFirestore } from "@/firebase";
import { LogOut } from "lucide-react";

export function CreateClubForm() {
  const { user, logout } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const db = useFirestore();
  const [clubName, setClubName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Je moet ingelogd zijn om een club te maken.",
      });
      return;
    }
    if (clubName.length < 3) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Clubnaam moet minstens 3 tekens lang zijn.",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Gebruik nu de herstelde, client-side createClub functie
      await createClub(db, user.uid, clubName);
      
      toast({
        title: "Succes!",
        description: `Club '${clubName}' succesvol aangemaakt. Log opnieuw in om verder te gaan.`,
      });
      // Forceer een logout zodat de gebruiker opnieuw kan inloggen met een token die (hopelijk)
      // de nieuwe claims bevat na de volgende stap.
      logout();
      router.push('/login');
      
    } catch (error: any) {
      console.error("Fout bij het maken van de club:", error);
      toast({
        variant: "destructive",
        title: "Fout bij het maken van de club",
        description: error.message || "Er is een onverwachte fout opgetreden.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nieuwe Clubnaam</Label>
            <Input
              id="name"
              name="name"
              placeholder="bv. SK Beveren"
              required
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading} size="lg">
            {isLoading && <Spinner size="small" className="mr-2" />}
            {isLoading ? "Club aanmaken..." : "Nieuwe club aanmaken"}
          </Button>
      </form>

      <div className="relative">
        <Separator />
        <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
            Of
            </span>
        </div>
      </div>

      <div className="text-center space-y-4">
          <Button variant="outline" asChild className="w-full">
            <Link href="/join-club">
                Sluit je aan bij een bestaande club
            </Link>
          </Button>
          <Button variant="secondary" onClick={logout} className="w-full">
            <LogOut className="mr-2 h-4 w-4" />
            Uitloggen
          </Button>
      </div>

    </div>
  );
}
