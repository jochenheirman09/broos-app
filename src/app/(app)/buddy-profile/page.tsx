"use client";

import { useState, useRef } from "react";
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
import { Sparkles, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoAvatar, TsubasaAvatar, RobotAvatar } from "@/components/app/predefined-avatars";

const predefinedAvatars = [
  { id: 'logo', component: LogoAvatar },
  { id: 'tsubasa', component: TsubasaAvatar },
  { id: 'robot', component: RobotAvatar },
];

export default function BuddyProfilePage() {
  const { toast } = useToast();
  // These will be loaded from the user's profile in the future
  const [buddyName, setBuddyName] = useState("Broos");
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>('logo');
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const handleSave = () => {
    // In a real app, you would save the buddyName and the selected avatar
    // (either the ID of the predefined one, or the URL of the uploaded one)
    // to the user's profile in Firestore.
    toast({
      title: "Opgeslagen!",
      description: "De gegevens van je buddy zijn bijgewerkt.",
    });
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCustomAvatar(result);
        setSelectedAvatar(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomUploadClick = () => {
    fileInputRef.current?.click();
  };

  const renderSelectedAvatar = () => {
    if (selectedAvatar && customAvatar === selectedAvatar) {
         return <img src={customAvatar} alt="Gek選舉n avatar" className="h-32 w-32 rounded-full object-cover border-4 border-primary" />;
    }
    const PredefinedComponent = predefinedAvatars.find(a => a.id === selectedAvatar)?.component;
    if (PredefinedComponent) {
        return <PredefinedComponent className="h-32 w-32" />;
    }
    return <LogoAvatar className="h-32 w-32" />;
  }

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
            
            {/* Huidige selectie */}
            <div className="flex justify-center my-4">
              {renderSelectedAvatar()}
            </div>

            {/* Voorgedefinieerde opties */}
            <div className="grid grid-cols-3 gap-4">
                {predefinedAvatars.map(avatar => {
                    const AvatarComponent = avatar.component;
                    return (
                        <div key={avatar.id} onClick={() => setSelectedAvatar(avatar.id)} className={cn("cursor-pointer p-2 rounded-2xl border-2 transition-all", selectedAvatar === avatar.id ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted")}>
                           <AvatarComponent className="w-full h-auto" />
                        </div>
                    )
                })}
            </div>
            
            {/* Upload knop */}
            <div className="!mt-6">
                <Button variant="outline" className="w-full" onClick={handleCustomUploadClick}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload eigen afbeelding
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>

          </div>

          <Button onClick={handleSave} className="w-full !mt-8" size="lg">
            Wijzigingen Opslaan
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
