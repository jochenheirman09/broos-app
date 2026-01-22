
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
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import { Upload, Image as ImageIcon } from "lucide-react";
import { useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import type { Club } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { updateClubLogo } from "@/actions/club-actions";

export function ClubLogoManager({ clubId }: { clubId: string }) {
  const db = useFirestore();
  const { toast } = useToast();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clubRef = useMemoFirebase(
    () => (db && clubId ? doc(db, "clubs", clubId) : null),
    [db, clubId]
  );
  // CORRECTED: The useDoc hook does not return forceRefetch.
  const { data: clubData } = useDoc<Club>(clubRef);

  const getInitials = (name: string = '') => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ variant: "destructive", title: "Bestand te groot", description: "Logo moet kleiner zijn dan 2MB." });
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogo = async () => {
    if (!logoPreview || !clubId) return;

    setIsUploading(true);

    try {
      const result = await updateClubLogo(clubId, logoPreview);
      if (result.success) {
        toast({ title: "Logo bijgewerkt!", description: "Het nieuwe clublogo is opgeslagen. De pagina wordt vernieuwd." });
        // CORRECTED: Reload the page to ensure the new logo is displayed everywhere.
        window.location.reload();
        setLogoPreview(null);
      } else {
        throw new Error(result.message);
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Upload mislukt", description: e.message });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
            <ImageIcon className="h-6 w-6" />
            Club Logo
        </CardTitle>
         <CardDescription>
            Upload een logo voor je club (PNG, JPG, WEBP). Het wordt veilig opgeslagen in de database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex flex-col items-center">
        <Avatar className="h-32 w-32 border-2 border-primary/20">
          <AvatarImage src={logoPreview || clubData?.logoURL} />
          <AvatarFallback className="text-4xl font-bold bg-muted">
            {clubData ? getInitials(clubData.name) : '?'}
          </AvatarFallback>
        </Avatar>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/png, image/jpeg, image/webp"
          disabled={isUploading}
        />

        <Button
          variant="outline"
          className="w-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          {clubData?.logoURL ? 'Nieuw logo kiezen' : 'Logo uploaden'}
        </Button>

        {logoPreview && (
          <Button onClick={handleSaveLogo} className="w-full" disabled={isUploading}>
            {isUploading && <Spinner size="small" className="mr-2" />}
            {isUploading ? 'Opslaan...' : 'Nieuw Logo Opslaan'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
