
"use client";

import { useState, useRef, useEffect } from "react";
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
import { useUser } from "@/context/user-context";
import { useFirestore } from "@/firebase/client-provider";
import { updateUserProfile } from "@/lib/firebase/firestore/user";
import { Spinner } from "@/components/ui/spinner";


const predefinedAvatars = [
  { id: 'logo', component: LogoAvatar },
  { id: 'tsubasa', component: TsubasaAvatar },
  { id: 'robot', component: RobotAvatar },
];

export default function BuddyProfilePage() {
  const { userProfile, user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  
  const [buddyName, setBuddyName] = useState("Broos");
  const [selectedAvatar, setSelectedAvatar] = useState<string>('logo');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userProfile) {
      setBuddyName(userProfile.buddyName || "Broos");
      setSelectedAvatar(userProfile.buddyAvatar || 'logo');
    }
  }, [userProfile]);


  const handleSave = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Niet ingelogd" });
      return;
    }

    setIsLoading(true);
    try {
      const updates = {
        buddyName,
        buddyAvatar: selectedAvatar,
      };

      await updateUserProfile({ db, userId: user.uid, data: updates });
      
      toast({
        title: "Opgeslagen!",
        description: "De gegevens van je buddy zijn bijgewerkt.",
      });
    } catch (error) {
      // The updateUserProfile function handles emitting the detailed error
      toast({ variant: "destructive", title: "Fout", description: "Kon de buddy-gegevens niet opslaan." });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Basic size check (e.g., 2MB)
      if (file.size > 2 * 1024 * 1024) {
          toast({
              variant: "destructive",
              title: "Bestand te groot",
              description: "Kies een afbeelding die kleiner is dan 2MB."
          });
          return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setSelectedAvatar(result); // Set the data URL as the selected avatar
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomUploadClick = () => {
    fileInputRef.current?.click();
  };

  const renderSelectedAvatar = () => {
    if (selectedAvatar && selectedAvatar.startsWith('data:image')) {
         return <img src={selectedAvatar} alt="Gek選舉n avatar" className="h-32 w-32 rounded-full object-cover border-4 border-primary" />;
    }
    const PredefinedComponent = predefinedAvatars.find(a => a.id === selectedAvatar)?.component;
    if (PredefinedComponent) {
        return <PredefinedComponent className="h-32 w-32" />;
    }
    // Fallback to default if nothing is selected or found
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
            
            <div className="flex justify-center my-4">
              {renderSelectedAvatar()}
            </div>

            <div className="grid grid-cols-3 gap-4">
                {predefinedAvatars.map(avatar => {
                    const AvatarComponent = avatar.component;
                    const isSelected = selectedAvatar === avatar.id;
                    return (
                        <div key={avatar.id} onClick={() => setSelectedAvatar(avatar.id)} className={cn("cursor-pointer p-2 rounded-2xl border-2 transition-all", isSelected ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted")}>
                           <AvatarComponent className="w-full h-auto" />
                        </div>
                    )
                })}
            </div>
            
            <div className="!mt-6">
                <Button variant="outline" className="w-full" onClick={handleCustomUploadClick}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload eigen afbeelding
                </Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>

          </div>

          <Button onClick={handleSave} className="w-full !mt-8" size="lg" disabled={isLoading}>
            {isLoading ? <Spinner size="small" className="mr-2" /> : "Wijzigingen Opslaan"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
