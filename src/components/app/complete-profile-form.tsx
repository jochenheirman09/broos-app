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
import { useAuth, useFirestore } from "@/firebase";
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

const formSchema = z.object({
  name: z.string().min(2, { message: "Naam is vereist." }),
  teamCode: z
    .string()
    .length(6, { message: "Teamcode moet 6 tekens lang zijn." }),
});

export function CompleteProfileForm() {
  const { user, userProfile } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: userProfile?.name || "",
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
          description: "Team niet gevonden. Controleer de code en probeer opnieuw.",
        });
        setIsLoading(false);
        return;
      }

      const teamDoc = teamSnapshot.docs[0];
      const teamId = teamDoc.id;

      // Update user profile
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name: values.name,
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Volledige Naam</FormLabel>
              <FormControl>
                <Input placeholder="Jan Janssen" {...field} />
              </FormControl>
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
