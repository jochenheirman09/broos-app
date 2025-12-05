
"use client";
import { useUser } from "@/context/user-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useRef, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore } from "@/firebase";
import { updateUserProfile } from "@/lib/firebase/firestore/user";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import { Spinner } from "@/components/ui/spinner";
import { Camera, LogOut, Sparkles, CalendarPlus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { WeekSchedule } from "@/components/app/week-schedule";
import { AddTrainingDialog } from "@/components/app/add-training-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet";
import { BuddyProfileCustomizer } from "./buddy-profile/page";
import { ScrollArea } from "../ui/scroll-area";

const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Naam moet minimaal 2 karakters lang zijn.",
  }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function ProfileSheet({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void; }) {
  const { user, userProfile, logout } = useUser();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const [isLoading, setIsLoading] = useState(false);
  const [newPhoto, setNewPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAddTrainingOpen, setIsAddTrainingOpen] = useState(false);
  const [refreshSchedule, setRefreshSchedule] = useState(0);
  const [showBuddyCustomizer, setShowBuddyCustomizer] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: {
      name: userProfile?.name || "",
    },
  });

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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
        setNewPhoto(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user || !auth.currentUser) return;
    setIsLoading(true);

    try {
      const updates: { name?: string; photoURL?: string } = {};
      let authUpdates: { displayName?: string; photoURL?: string } = {};

      if (data.name !== userProfile?.name) {
        updates.name = data.name;
        authUpdates.displayName = data.name;
      }
      if (newPhoto) {
        updates.photoURL = newPhoto;
        authUpdates.photoURL = newPhoto;
      }

      if (Object.keys(updates).length > 0) {
        await updateUserProfile({ db: firestore, userId: user.uid, data: updates });

        if (Object.keys(authUpdates).length > 0) {
          await updateAuthProfile(auth.currentUser, authUpdates);
        }

        toast({
          title: "Profiel bijgewerkt",
          description: "Je profiel wordt bijgewerkt. Het kan even duren voordat de wijzigingen overal zichtbaar zijn.",
        });
        setNewPhoto(null);
      } else {
        toast({
          title: "Geen wijzigingen",
          description: "Er waren geen wijzigingen om op te slaan.",
        });
      }
    } catch (error) {
      console.error("Error updating profile: ", error);
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Er is een fout opgetreden bij het bijwerken van je profiel.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onTrainingAdded = () => {
    setIsAddTrainingOpen(false);
    setRefreshSchedule(prev => prev + 1);
    toast({
      title: "Training toegevoegd!",
      description: "Je individuele training is opgeslagen in je schema."
    });
  }

  // Reset internal state when sheet is closed
  useEffect(() => {
    if (!isOpen) {
      setShowBuddyCustomizer(false);
    }
  }, [isOpen]);

  if (!userProfile) return null;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="w-full max-w-md p-0 flex flex-col">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle>
                {showBuddyCustomizer ? "Buddy Aanpassen" : "Jouw Profiel"}
            </SheetTitle>
            <SheetDescription>
              {showBuddyCustomizer 
                ? "Geef je AI-buddy een persoonlijke naam en uiterlijk." 
                : "Bekijk en bewerk hier je persoonlijke gegevens en planning."
              }
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-1">
            <div className="px-6 space-y-8 py-6">
              {showBuddyCustomizer ? (
                <BuddyProfileCustomizer onSave={() => {
                  setShowBuddyCustomizer(false); 
                  onOpenChange(false);
                }} />
              ) : (
              <>
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar
                      className="h-24 w-24 cursor-pointer"
                      onClick={handleAvatarClick}
                    >
                      <AvatarImage src={newPhoto || userProfile.photoURL} />
                      <AvatarFallback className="text-3xl bg-primary/20 text-primary font-bold">
                        {userProfile.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 bg-secondary text-secondary-foreground rounded-full p-1.5 border-2 border-background">
                      <Camera className="h-4 w-4" />
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept="image/*"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-2xl font-bold truncate">{userProfile.name}</h2>
                    <p className="text-muted-foreground truncate">{userProfile.email}</p>
                  </div>
                </div>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Volledige naam</FormLabel>
                          <FormControl>
                            <Input placeholder="Jan Janssen" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" disabled={isLoading} className="w-full">
                      {isLoading && <Spinner className="mr-2 h-4 w-4" />}
                      Wijzigingen opslaan
                    </Button>
                  </form>
                </Form>

                {userProfile.role === 'player' && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Planning & Instellingen</h3>
                      <WeekSchedule key={refreshSchedule} />
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button variant="outline" onClick={() => setIsAddTrainingOpen(true)}>
                          <CalendarPlus className="mr-2 h-4 w-4" />
                          Individuele Training Toevoegen
                        </Button>
                        <Button variant="outline" onClick={() => setShowBuddyCustomizer(true)}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Buddy Aanpassen
                        </Button>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="flex justify-end">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Uitloggen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Je wordt uitgelogd en teruggestuurd naar de
                          startpagina.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuleren</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { onOpenChange(false); logout(); }}>
                          Uitloggen
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
      <AddTrainingDialog
        isOpen={isAddTrainingOpen}
        setIsOpen={setIsAddTrainingOpen}
        onTrainingAdded={onTrainingAdded}
      />
    </>
  );
}
