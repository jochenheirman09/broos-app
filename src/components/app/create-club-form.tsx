"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/context/user-context";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "../ui/spinner";
import { createClub } from "@/lib/firebase/firestore/club";
import { useFirestore } from "@/firebase";
import Link from "next/link";

export function CreateClubForm() {
  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();
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
      await createClub(firestore, user.uid, clubName);
      toast({
        title: "Succes!",
        description: "Je club is aangemaakt.",
      });
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
    <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Clubnaam</Label>
          <Input
            id="name"
            name="name"
            placeholder="bv. Real Madrid"
            required
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading} size="lg">
          {isLoading && <Spinner size="small" className="mr-2" />}
          {isLoading ? "Club aanmaken..." : "Club aanmaken"}
        </Button>

         <div className="text-center text-sm">
            <Link href="#" className="text-muted-foreground hover:text-primary transition-colors">
                Of sluit je aan bij een bestaande club
            </Link>
        </div>
    </form>
  );
}
