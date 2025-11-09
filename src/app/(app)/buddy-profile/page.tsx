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
import { Sparkles, Wand2 } from "lucide-react";
import { BuddyAvatar } from "@/components/app/buddy-avatar";
import { Spinner } from "@/components/ui/spinner";
import { generateAvatar } from "@/ai/flows/avatar-flow";

export default function BuddyProfilePage() {
  const { toast } = useToast();
  // These will be loaded from the user's profile in the future
  const [buddyName, setBuddyName] = useState("Broos");
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateAvatar = async () => {
    if (!avatarPrompt.trim()) {
      toast({
        variant: "destructive",
        title: "Prompt is leeg",
        description: "Voer een beschrijving in om een avatar te genereren.",
      });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateAvatar(avatarPrompt);
      if (result.media) {
        setAvatarUrl(result.media);
        toast({
          title: "Avatar gegenereerd!",
          description: "Je nieuwe buddy-avatar is klaar.",
        });
      } else {
        throw new Error("No media returned from AI.");
      }
    } catch (error) {
      console.error("Error generating avatar:", error);
      toast({
        variant: "destructive",
        title: "Genereren mislukt",
        description: "Kon de avatar niet genereren. Probeer het opnieuw.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

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
              {isGenerating ? (
                <div className="h-32 w-32 flex items-center justify-center bg-muted rounded-full">
                    <Spinner size="large" />
                </div>
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="Gegenereerde avatar" className="h-32 w-32 rounded-full object-cover border-4 border-primary" />
              ) : (
                <BuddyAvatar className="h-32 w-32 text-8xl" />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar-prompt">
                Genereer een nieuwe avatar
              </Label>
              <p className="text-sm text-muted-foreground">
                Beschrijf hoe je buddy eruit moet zien (bv. "een vriendelijke, lachende robot").
              </p>
              <div className="flex gap-2">
                <Input
                  id="avatar-prompt"
                  value={avatarPrompt}
                  onChange={(e) => setAvatarPrompt(e.target.value)}
                  placeholder="Beschrijving..."
                  disabled={isGenerating}
                />
                <Button onClick={handleGenerateAvatar} disabled={isGenerating}>
                  {isGenerating ? (
                    <Spinner size="small" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  <span className="sr-only">Genereer</span>
                </Button>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} className="w-full">
            Wijzigingen Opslaan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
