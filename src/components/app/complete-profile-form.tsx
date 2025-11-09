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
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useFirestore } from "@/firebase";
import { Spinner } from "../ui/spinner";
import { useUser } from "@/context/user-context";
import {
  collectionGroup,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "../ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamCode: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !db) return;

    setIsLoading(true);
    try {
      // Find the team with the given invitation code
      const teamsQuery = query(
        collectionGroup(db, "teams"),
        where("invitationCode", "==", values.teamCode)
      );
      const teamSnapshot = await getDocs(teamsQuery);

      if (teamSnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Ongeldige Code",
          description:
            "Team niet gevonden. Controleer de code en probeer opnieuw.",
        });
        setIsLoading(false);
        return;
      }

      const teamDoc = teamSnapshot.docs[0];
      const teamId = teamDoc.id;

      // Update user profile
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        birthDate: values.birthDate.toISOString().split("T")[0], // format as YYYY-MM-DD
        teamId: teamId,
      });

      toast({
        title: "Profiel Bijgewerkt",
        description: "Je bent succesvol aan het team toegevoegd!",
      });

      // The layout will handle redirection
    } catch (error: any) {
      console.error("Error completing profile:", error);
      toast({
        variant: "destructive",
        title: "Fout",
        description:
          error.message || "Kon profiel niet bijwerken. Probeer het opnieuw.",
      });
    } finally {
      setIsLoading(false);
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
              <Popover>
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
                  <Calendar
                    mode="single"
                    captionLayout="dropdown-buttons"
                    fromYear={1950}
                    toYear={new Date().getFullYear()}
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
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
