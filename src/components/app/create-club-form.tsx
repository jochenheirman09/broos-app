"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/context/user-context";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "../ui/spinner";
import { createClub } from "@/lib/club";
import { useFirestore } from "@/firebase";

export function CreateClubForm() {
  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const [clubName, setClubName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to create a club.",
      });
      return;
    }
    if (clubName.length < 3) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Club name must be at least 3 characters long.",
      });
      return;
    }

    setIsLoading(true);

    try {
      await createClub(firestore, user.uid, clubName);
      toast({
        title: "Success!",
        description: "Your club has been created.",
      });
      // The user context will update automatically and redirect
      // so we don't need to force a router.push here.
    } catch (error: any) {
      console.error("Error creating club:", error);
      toast({
        variant: "destructive",
        title: "Error creating club",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Club Name</Label>
          <Input
            id="name"
            name="name"
            placeholder="e.g. Real Madrid"
            required
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={isLoading} size="lg">
          {isLoading && <Spinner size="small" className="mr-2" />}
          {isLoading ? "Creating Club..." : "Create Club"}
        </Button>
      </div>
    </form>
  );
}
