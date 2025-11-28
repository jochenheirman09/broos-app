
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { Spinner } from "../ui/spinner";
import { useUser } from "@/context/user-context";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Team, Club } from "@/lib/types";
import { updateUserProfile } from "@/lib/firebase/firestore/user";
import { DatePickerWithDropdowns } from "../ui/date-picker-with-dropdowns";

const formSchema = z.object({
  birthDate: z.date({
    required_error: "Geboortedatum is vereist.",
  }),
  teamCode: z.string().min(1, { message: "Teamcode is vereist." }),
});

export function CompleteProfileForm() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamCode: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !db) {
      console.error("[Submit Aborted] No user or db connection.");
      return;
    }

    setIsLoading(true);
    console.log("[Submit Start] Submitting with values:", {
      birthDate: values.birthDate.toISOString(),
      teamCode: values.teamCode,
    });
    
    let foundTeam: { id: string, clubId: string } | null = null;

    try {
      // Step 1: Get all clubs. This is allowed by security rules.
      console.log("[Querying] Fetching all clubs to search for the team code.");
      const clubsQuery = query(collection(db, "clubs"));
      const clubsSnapshot = await getDocs(clubsQuery);
      
      if (clubsSnapshot.empty) {
        throw new Error("Er zijn geen clubs gevonden in het systeem.");
      }
      console.log(`[Query Result] Found ${clubsSnapshot.docs.length} clubs. Now searching within each...`);

      // Step 2: Iterate through each club and query its 'teams' subcollection.
      for (const clubDoc of clubsSnapshot.docs) {
        const club = {id: clubDoc.id, ...clubDoc.data()} as Club;
        console.log(`[Searching] Looking in club "${club.name}" (ID: ${club.id}) for team code.`);

        const teamsRef = collection(db, "clubs", club.id, "teams");
        const teamQuery = query(
          teamsRef,
          where("invitationCode", "==", values.teamCode),
          limit(1)
        );

        const teamSnapshot = await getDocs(teamQuery);

        if (!teamSnapshot.empty) {
          const teamDoc = teamSnapshot.docs[0];
          const teamData = teamDoc.data() as Team;
          foundTeam = {
            id: teamDoc.id,
            clubId: teamData.clubId, // We get the clubId from the team document itself.
          };
          console.log(`[SUCCESS] Found team! Team ID: ${foundTeam.id}, Club ID: ${foundTeam.clubId}`);
          break; // Exit the loop once the team is found
        }
      }

      if (!foundTeam) {
        console.error(`[Query Result] No team found across all clubs for code: "${values.teamCode}"`);
        toast({
          variant: "destructive",
          title: "Ongeldige Code",
          description: "Team niet gevonden. Controleer de code en probeer opnieuw.",
        });
        setIsLoading(false);
        return;
      }
      
      // Step 3: Update the user profile with the found teamId and clubId.
      const updatedProfile = {
        birthDate: values.birthDate.toISOString().split("T")[0],
        teamId: foundTeam.id,
        clubId: foundTeam.clubId,
      };
      
      console.log("[Profile Update] Attempting to update user profile with:", updatedProfile);

      await updateUserProfile({
        db,
        userId: user.uid,
        data: updatedProfile,
      });

      console.log("[Profile Update] User profile update successful.");
      toast({
        title: "Profiel Bijgewerkt",
        description: "Je bent succesvol aan het team toegevoegd!",
      });

    } catch (e: any) {
      console.error("[Submit Error] An error occurred during profile completion:", e);
      // This will now more likely catch permission errors on the clubs collection if any.
      if (e.code?.includes('permission-denied')) {
        const permissionError = new FirestorePermissionError({ path: "clubs", operation: "list" });
        errorEmitter.emit("permission-error", permissionError);
         toast({
          variant: "destructive",
          title: "Permissiefout",
          description: "Kon de clubs niet doorzoeken om je team te vinden. Controleer de Firestore-regels.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Fout",
          description: e.message || "Er is een onbekende fout opgetreden.",
        });
      }
    } finally {
      setIsLoading(false);
      console.log("[Submit End]");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="birthDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Geboortedatum</FormLabel>
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Kies een datum</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePickerWithDropdowns
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                    footer={
                      <div className="p-2 border-t">
                        <Button
                          className="w-full"
                          onClick={() => setIsPopoverOpen(false)}
                          disabled={!field.value}
                        >
                          Mijn verjaardag!
                        </Button>
                      </div>
                    }
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="teamCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Uitnodigingscode</FormLabel>
              <FormControl>
                <Input placeholder="ABCDEF" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
          size="lg"
        >
          {isLoading && <Spinner size="small" className="mr-2" />}
          {isLoading ? "Opslaan..." : "Profiel Opslaan"}
        </Button>
      </form>
    </Form>
  );
}
