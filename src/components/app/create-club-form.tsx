
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUser } from "@/context/user-context";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { createClubWithLogo } from "@/actions/club-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import type { SportProfile } from "@/lib/types";

export function CreateClubForm() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [clubName, setClubName] = useState("");
  const [sport, setSport] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sportsQuery = useMemoFirebase(
    () => (db ? query(collection(db, "sport_profiles"), orderBy("name")) : null),
    [db]
  );
  const { data: sports, isLoading: isLoadingSports } = useCollection<SportProfile>(sportsQuery);

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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) {
      toast({ variant: "destructive", title: "Fout", description: "Je moet ingelogd zijn om een club te maken." });
      return;
    }
    if (clubName.length < 3) {
      toast({ variant: "destructive", title: "Fout", description: "Clubnaam moet minstens 3 tekens lang zijn." });
      return;
    }
    if (!sport) {
      toast({ variant: "destructive", title: "Fout", description: "Selecteer een sport voor de club." });
      return;
    }

    setIsLoading(true);

    try {
      const result = await createClubWithLogo(user.uid, clubName, sport, logoPreview || undefined);
      
      if (result.success) {
        toast({ title: "Succes!", description: `${result.message} De pagina wordt vernieuwd.` });
        await user.getIdToken(true);
        window.location.reload();
      } else {
        throw new Error(result.message);
      }
      
    } catch (error: any) {
      console.error("Fout bij het maken van de club:", error);
      toast({ variant: "destructive", title: "Fout bij het maken van de club", description: error.message || "Er is een onverwachte fout opgetreden." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
                <AvatarImage src={logoPreview ?? undefined} />
                <AvatarFallback className="text-4xl font-bold bg-muted">?</AvatarFallback>
            </Avatar>
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4"/>
                Upload Clublogo (Optioneel)
            </Button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp"/>
          </div>

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
          
          <div className="space-y-2">
            <Label htmlFor="sport">Sport</Label>
            <Select onValueChange={setSport} value={sport} disabled={isLoadingSports}>
              <SelectTrigger id="sport">
                <SelectValue placeholder={isLoadingSports ? "Laden..." : "Selecteer de hoofdsport..."} />
              </SelectTrigger>
              <SelectContent>
                {sports?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      <div className="text-center">
          <Button variant="outline" asChild className="w-full">
            <Link href="/join-club">
                Sluit je aan bij een bestaande club
            </Link>
          </Button>
      </div>
    </div>
  );
}
