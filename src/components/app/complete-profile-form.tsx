
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
import { Spinner } from "../ui/spinner";
import { useUser } from "@/context/user-context";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { DatePickerWithDropdowns } from "../ui/date-picker-with-dropdowns";
import { updateUserTeam } from "@/actions/user-actions";
import { useRouter } from "next/navigation";

// A staff member only needs to provide a team code. A player needs both.
const formSchema = z.object({
  birthDate: z.date().optional(),
  teamCode: z.string().min(1, { message: "Teamcode is vereist." }),
});

export function CompleteProfileForm() {
  const { user, userProfile } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamCode: "",
    },
  });

  const isPlayer = userProfile?.role === 'player';

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({ variant: "destructive", title: "Fout", description: "Je bent niet ingelogd." });
      return;
    }
    // A player MUST provide a birthdate.
    if (isPlayer && !values.birthDate) {
        form.setError("birthDate", { message: "Geboortedatum is vereist voor spelers." });
        return;
    }

    setIsLoading(true);

    try {
      const updates = isPlayer 
        ? { birthDate: values.birthDate!.toISOString().split("T")[0] }
        : {};

      const result = await updateUserTeam(user.uid, values.teamCode, updates);

      if (result.success) {
        toast({
          title: "Profiel Voltooid!",
          description: `${result.message} De pagina wordt herladen.`,
        });
        
        console.log("[Complete Profile Form] Forcing token refresh...");
        await user.getIdToken(true);
        console.log("[Complete Profile Form] Token refreshed, reloading page.");
        window.location.reload(); 
      
      } else {
        throw new Error(result.message);
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fout",
        description: error.message || "Er is een onbekende fout opgetreden.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {isPlayer && (
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
                            Selecteer
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
        )}
        <FormField
          control={form.control}
          name="teamCode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Uitnodigingscode</FormLabel>
              <FormControl>
                <Input placeholder="Code van je coach" {...field} />
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
