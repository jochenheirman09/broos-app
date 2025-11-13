
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
} from "firebase/auth";
import { useAuth, useFirestore } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import type { UserRole, Gender } from "@/lib/types";
import { Spinner } from "../ui/spinner";
import { Checkbox } from "../ui/checkbox";
import Link from "next/link";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

const roles: UserRole[] = ["player", "staff", "responsible"];
const genders: { value: Gender; label: string }[] = [
    { value: "male", label: "Jongen" },
    { value: "female", label: "Meisje" },
    { value: "other", label: "Andere" },
    { value: "prefer_not_to_say", label: "Zeg ik liever niet" },
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
    gender: z.enum(["male", "female", "other", "prefer_not_to_say"], {
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
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: values.name,
      });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: values.name,
        email: values.email,
        role: values.role,
        gender: values.gender,
        emailVerified: false,
        acceptedTerms: true,
        clubId: null, // Explicitly set clubId to null
      });

      await sendEmailVerification(user);

      toast({
        title: "Registratie succesvol",
        description:
          "Er is een verificatie-e-mail verzonden. Controleer je inbox.",
      });

      router.push("/verify-email");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Registratie mislukt",
        description: error.message,
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
            <FormItem className="space-y-3">
              <FormLabel>Geslacht</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                    {genders.map(gender => (
                        <FormItem key={gender.value} className="flex items-center space-x-3 space-y-0">
                            <FormControl>
                                <RadioGroupItem value={gender.value} />
                            </FormControl>
                            <FormLabel className="font-normal">
                                {gender.label}
                            </FormLabel>
                        </FormItem>
                    ))}
                </RadioGroup>
              </FormControl>
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
                    {roles.map((role) => (
                      <SelectItem
                        key={role}
                        value={role}
                        className="capitalize"
                      >
                        {role}
                      </SelectItem>
                    ))}
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
