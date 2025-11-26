
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
} from "firebase/auth";
import { useAuth, useFirestore } from "@/firebase/provider";
import { doc, setDoc } from "firebase/firestore";
import type { UserRole, Gender } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { Checkbox } from "../ui/checkbox";

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
    acceptedTerms: z.literal<boolean>(true, {
      errorMap: () => ({ message: "Je moet akkoord gaan met de voorwaarden." }),
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

  useEffect(() => {
    if (selectedRole && roles.includes(selectedRole)) {
      form.setValue("role", selectedRole);
    }
  }, [selectedRole, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: values.name,
        email: values.email,
        role: values.role,
        gender: values.gender,
        emailVerified: false,
        onboardingCompleted: false,
        acceptedTerms: values.acceptedTerms,
      });

      await sendEmailVerification(user);

      toast({
        title: "Registratie succesvol",
        description: "Er is een verificatie-e-mail verzonden. Controleer je inbox.",
      });

      router.push("/verify-email");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registratie mislukt",
        description:
          error.code === "auth/email-already-in-use"
            ? "Dit e-mailadres is al in gebruik."
            : error.message || "Er is een onbekende fout opgetreden.",
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
        )}
        
        <FormField
          control={form.control}
          name="acceptedTerms"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md p-4 shadow-clay-inset">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Ik ga akkoord met de{" "}
                  <a
                    href="/terms-and-conditions"
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    algemene voorwaarden
                  </a>{" "}
                  en het{" "}
                  <a
                    href="/privacy-policy"
                    target="_blank"
                    className="text-primary hover:underline"
                  >
                    privacybeleid
                  </a>
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
