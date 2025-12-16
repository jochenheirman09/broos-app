
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
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teamCode: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      console.error("[Submit Aborted] No user.");
      return;
    }

    setIsLoading(true);

    const result = await updateUserTeam(user.uid, values.teamCode, {
      birthDate: values.birthDate.toISOString().split("T")[0],
    });

    if (result.success) {
      toast({
        title: "Profiel Bijgewerkt",
        description: "Je bent succesvol aan het team toegevoegd!",
      });
      // The redirect will be handled by the AppLayout's useEffect.
    } else {
      toast({
        variant: "destructive",
        title: "Fout",
        description: result.message,
      });
    }

    setIsLoading(false);
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
