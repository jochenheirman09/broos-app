
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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useAuth, useFirestore, firebaseConfig } from "@/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import type { UserRole, Gender } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { Checkbox } from "../ui/checkbox";
import Link from "next/link";
import { User } from 'firebase/auth';


const roles: UserRole[] = ["player", "staff", "responsible"];
const genders: { value: Gender; labelPlayer: string; labelAdult: string }[] = [
  { value: "male", labelPlayer: "Jongen", labelAdult: "Man" },
  { value: "female", labelPlayer: "Meisje", labelAdult: "Vrouw" },
];


const formSchema = z
  .object({
    name: z
      .string()
      .min(2, { message: "Naam moet minstens 2 tekens bevatten." }),
    email: z.string().email({ message: "Voer een geldig e-mailadres in." }),
    password: z
      .string()
      .min(6, { message: "Wachtwoord moet minstens 6 tekens bevatten." }),
    confirmPassword: z.string(),
    role: z.enum(roles, { required_error: "Selecteer een rol." }),
    gender: z.enum(["male", "female"], {
      required_error: "Selecteer je geslacht.",
    }),
    acceptedTerms: z.boolean().refine((val) => val === true, {
      message:
        "Je moet akkoord gaan met het privacybeleid en de voorwaarden.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Wachtwoorden komen niet overeen.",
    path: ["confirmPassword"],
  });

export function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();

  const selectedRole = searchParams.get("role") as UserRole | null;
  

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: selectedRole || undefined,
      acceptedTerms: false,
    },
  });

  const watchedRole = form.watch("role");

  // This function creates the Firestore user document.
  // It's used for both new users and existing "ghost" users.
  const createFirestoreUserDocument = async (user: User, values: z.infer<typeof formSchema>) => {
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name: values.name,
      email: values.email,
      role: values.role,
      gender: values.gender,
      emailVerified: user.emailVerified,
      onboardingCompleted: false,
      acceptedTerms: true,
      clubId: values.role === 'responsible' ? null : undefined, // Explicitly null for responsible
      teamId: undefined, // Will be set in complete-profile
    });
    // Also update the auth profile display name
    if (user.displayName !== values.name) {
      await updateProfile(user, { displayName: values.name });
    }
  };

  useEffect(() => {
    if (selectedRole && roles.includes(selectedRole)) {
      form.setValue("role", selectedRole);
    }
  }, [selectedRole, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!db || !auth) {
      toast({
        variant: "destructive",
        title: "Registratie mislukt",
        description: "Firebase is niet beschikbaar.",
      });
      return;
    }
    setIsLoading(true);
    try {
      // First, try to create a new user.
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;
      
      // If successful, create their Firestore document.
      await createFirestoreUserDocument(user, values);
      
      await sendEmailVerification(user);

      toast({
        title: "Registratie succesvol",
        description: "Er is een verificatie-e-mail verzonden. Controleer je inbox.",
      });

      router.push("/verify-email");

    } catch (error: any) {
      // If the error is 'auth/email-already-in-use', we handle the "ghost user" case.
      if (error.code === 'auth/email-already-in-use') {
        try {
          // Try to sign in the user. This will fail if the password is wrong.
          const existingUserCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
          const existingUser = existingUserCredential.user;

          // Check if a Firestore document already exists for this user.
          const userDocRef = doc(db, "users", existingUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            // The user exists in Auth, but not in Firestore. Create the doc.
            await createFirestoreUserDocument(existingUser, values);
            toast({
              title: "Account hersteld!",
              description: "Je account bestond al maar je profiel was incompleet. Dit is nu hersteld.",
            });
          }
          // Whether the doc existed or not, redirect them.
           if (!existingUser.emailVerified) {
              // Resend verification just in case and redirect
              await sendEmailVerification(existingUser);
              toast({
                title: "Verificatie vereist",
                description: "Je e-mailadres is nog niet geverifieerd. Een nieuwe e-mail is onderweg."
              });
              router.push('/verify-email');
           } else {
              // If verified, proceed to the dashboard.
              toast({
                title: "Welkom terug!",
                description: "Je wordt ingelogd.",
              });
              router.push('/dashboard');
           }

        } catch (signInError: any) {
          // If sign-in fails, it's likely a wrong password for an existing account.
          toast({
            variant: "destructive",
            title: "Registratie mislukt",
            description: "Dit e-mailadres is al in gebruik. Als dit jouw account is, probeer dan in te loggen of je wachtwoord te herstellen.",
          });
        }
      } else {
        // Handle other registration errors.
        toast({
          variant: "destructive",
          title: "Registratie mislukt",
          description: error.message || "Er is een onbekende fout opgetreden.",
        });
      }
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
              <FormLabel>Naam</FormLabel>
              <FormControl>
                <Input placeholder="Jan Janssen" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input placeholder="jan@voorbeeld.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Wachtwoord</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Herhaal wachtwoord</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Geslacht</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer je geslacht" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {genders.map((gender) => (
                    <SelectItem key={gender.value} value={gender.value}>
                      {watchedRole === "player"
                        ? gender.labelPlayer
                        : gender.labelAdult}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />


        {!selectedRole && (
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rol</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecteer je rol" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="player">Speler</SelectItem>
                    <SelectItem value="staff">Staf</SelectItem>
                    <SelectItem value="responsible">Clubverantwoordelijke</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
        <FormField
          control={form.control}
          name="acceptedTerms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-clay-inset">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Ik ga akkoord met het{" "}
                  <Link href="/privacy-policy" className="text-primary hover:underline" target="_blank">
                    Privacybeleid
                  </Link>{" "}
                  en de{" "}
                  <Link href="/terms-and-conditions" className="text-primary hover:underline" target="_blank">
                    Algemene Voorwaarden
                  </Link>
                  .
                </FormLabel>
                <FormMessage />
              </div>
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
          {isLoading ? "Account aanmaken..." : "Account aanmaken"}
        </Button>
      </form>
    </Form>
  );
}
