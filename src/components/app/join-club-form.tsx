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
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Club } from "@/lib/types";
import { updateUserProfile } from "@/lib/firebase/firestore/user";
import Link from "next/link";
import { Separator } from "../ui/separator";

const formSchema = z.object({
  clubCode: z.string().min(1, { message: "Clubcode is vereist." }),
});

export function JoinClubForm() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clubCode: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !db) {
      return;
    }

    setIsLoading(true);

    const clubsQuery = query(
      collection(db, "clubs"),
      where("invitationCode", "==", values.clubCode)
    );

    try {
      const clubSnapshot = await getDocs(clubsQuery);

      if (clubSnapshot.empty) {
        toast({
          variant: "destructive",
          title: "Ongeldige Code",
          description:
            "Club niet gevonden. Controleer de code en probeer opnieuw.",
        });
        setIsLoading(false);
        return;
      }

      const clubDoc = clubSnapshot.docs[0];
      const clubData = clubDoc.data() as Club;
      
      const updatedProfile = {
        clubId: clubData.id, 
      };

      // Use the centralized update function
      updateUserProfile({
        db,
        userId: user.uid,
        data: updatedProfile,
      });

      toast({
        title: "Succes!",
        description: `Je bent succesvol aan club '${clubData.name}' toegevoegd!`,
      });
      // The layout will automatically redirect the user upon context update
      
    } catch (queryError) {
      console.error("Error executing clubs query:", queryError);
      const permissionError = new FirestorePermissionError({
        path: "clubs", // collection group query
        operation: "list",
      });
      errorEmitter.emit("permission-error", permissionError);
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
        <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
            control={form.control}
            name="clubCode"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Club Uitnodigingscode</FormLabel>
                <FormControl>
                    <Input placeholder="ABCDEF12" {...field} />
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
            {isLoading ? "Aansluiten..." : "Aansluiten bij Club"}
            </Button>
        </form>
        </Form>
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
                <Link href="/create-club">
                    Maak een nieuwe club
                </Link>
            </Button>
        </div>
    </div>
  );
}
