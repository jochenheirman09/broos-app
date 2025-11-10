"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";
import { BuddyAvatar } from "@/components/app/buddy-avatar";

export default function BuddyProfilePage() {
  const { toast } = useToast();
  // These will be loaded from the user's profile in the future
  const [buddyName, setBuddyName] = useState("Broos");
  const [avatarUrl] = useState<string | null>(null);

  const handleSave = () => {
    // In a real app, you would save the buddyName and avatarUrl
    // to the user's profile in Firestore.
    toast({
      title: "Opgeslagen!",
      description: "De gegevens van je buddy zijn bijgewerkt.",
    });
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            <span>Pas je Buddy aan</span>
          </CardTitle>
          <CardDescription>
            Geef je AI-buddy een persoonlijke naam en uiterlijk.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-2">
            <Label htmlFor="buddy-name">Naam van je Buddy</Label>
            <Input
              id="buddy-name"
              value={buddyName}
              onChange={(e) => setBuddyName(e.target.value)}
              placeholder="bv. Broos"
            />
          </div>

          <div className="space-y-4">
            <Label>Avatar van je Buddy</Label>
            <div className="flex justify-center my-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Gegenereerde avatar"
                  className="h-32 w-32 rounded-full object-cover border-4 border-primary"
                />
              ) : (
                <BuddyAvatar className="h-32 w-32 text-8xl" />
              )}
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Avatar generatie is momenteel niet beschikbaar.
            </p>
          </div>

          <Button onClick={handleSave} className="w-full">
            Wijzigingen Opslaan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
