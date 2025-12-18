
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
import { useAuth, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import { Spinner } from "@/components/ui/spinner";
import { Camera, LogOut, Sparkles, CalendarPlus, Users } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { WeekSchedule } from "@/components/app/week-schedule";
import { AddTrainingDialog } from "@/components/app/add-training-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter
} from "@/components/ui/sheet";
import { BuddyProfileCustomizer } from "./buddy-profile/page";
import { ScrollArea, ScrollViewport } from "../ui/scroll-area";
import { updateUserProfile } from "@/lib/firebase/firestore/user";
import { updateUserTeam } from "@/actions/user-actions";
import { doc } from 'firebase/firestore';
import type { Team } from '@/lib/types';


const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Naam moet minimaal 2 karakters lang zijn.",
  }),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

const teamChangeFormSchema = z.object({
  teamCode: z.string().min(1, { message: "Teamcode is vereist." }),
});
type TeamChangeFormValues = z.infer<typeof teamChangeFormSchema>;


function TeamManagementCard() {
    const { user, forceRefetch } = useUser();
    const { toast } = useToast();
    const [isUpdatingTeam, setIsUpdatingTeam] = useState(false);

    const teamForm = useForm<TeamChangeFormValues>({
        resolver: zodResolver(teamChangeFormSchema),
        defaultValues: { teamCode: "" },
    });

    async function onTeamChangeSubmit(values: TeamChangeFormValues) {
        if (!user) return;
        setIsUpdatingTeam(true);
        try {
            const result = await updateUserTeam(user.uid, values.teamCode);
            if (result.success) {
                toast({
                    title: "Team Gewijzigd!",
                    description: "Je bent succesvol van team gewisseld. De app wordt herladen.",
                });
                forceRefetch();
                // Reload to apply new context and claims everywhere
                window.location.reload();
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Wisselen Mislukt",
                description: error.message,
            });
        } finally {
            setIsUpdatingTeam(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <span>Team Management</span>
                </CardTitle>
                <CardDescription>
                    Voer een nieuwe teamcode in om van team te wisselen binnen je club.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...teamForm}>
                    <form onSubmit={teamForm.handleSubmit(onTeamChangeSubmit)} className="space-y-4">
                        <FormField
                            control={teamForm.control}
                            name="teamCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nieuwe Team Uitnodigingscode</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Teamcode" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isUpdatingTeam} className="w-full">
                            {isUpdatingTeam && <Spinner className="mr-2 h-4 w-4" />}
                            Wissel van Team
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export function ProfileSheet({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void; }) {
  const { user, userProfile, logout, forceRefetch } = useUser();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
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

  useEffect(() => {
    if (userProfile) {
        form.reset({ name: userProfile.name });
    }
  }, [userProfile, form]);
  

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
        await updateUserProfile({ db, userId: user.uid, data: updates });

        if (Object.keys(authUpdates).length > 0) {
          await updateAuthProfile(auth.currentUser, authUpdates);
        }

        toast({
          title: "Profiel bijgewerkt",
          description: "Je profiel wordt bijgewerkt. Het kan even duren voordat de wijzigingen overal zichtbaar zijn.",
        });
        setNewPhoto(null);
        forceRefetch();
      } else {
        toast({
          title: "Geen wijzigingen",
          description: "Er waren geen wijzigingen om op te slaan.",
        });
      }
    } catch (error: any) {
      console.error("Error updating profile: ", error);
      toast({
        variant: "destructive",
        title: "Fout",
        description: "Er is een fout opgetreden bij het bijwerken van je profiel: " + error.message,
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
          <SheetHeader className="p-6 pb-4">
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
          
          <ScrollArea className="flex-1 min-h-0">
            <ScrollViewport className="h-full">
                <div className="px-6 pb-6 space-y-6">
                    {showBuddyCustomizer ? (
                    <BuddyProfileCustomizer onSave={() => {
                        setShowBuddyCustomizer(false); 
                        forceRefetch();
                    }} />
                    ) : (
                    <>
                    <div className="flex items-center gap-6 pt-2">
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
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                    {(userProfile.role === 'player' || userProfile.role === 'staff') && <TeamManagementCard />}

                    </>
                    )}
                </div>
            </ScrollViewport>
          </ScrollArea>

          {!showBuddyCustomizer && (
            <SheetFooter className="p-6 pt-4 border-t">
                <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto ml-auto">
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
            </SheetFooter>
          )}

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
