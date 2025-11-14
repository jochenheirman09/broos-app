
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
import React, { useState } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { FirestorePermissionError } from "@/firebase/errors";
import { errorEmitter } from "@/firebase/error-emitter";
import { Team } from "@/lib/types";
import { updateUserProfile } from "@/lib/firebase/firestore/user";
import { DayPicker, DropdownProps } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ScrollArea } from "../ui/scroll-area";
import { buttonVariants } from "../ui/button";

// ===== START: Geïntegreerde DatePickerWithDropdowns component =====
function DatePickerWithDropdowns({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium hidden",
        caption_dropdowns: "flex justify-center gap-2",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today: "bg-accent text-accent-foreground",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
        Dropdown: (dropdownProps: DropdownProps) => {
            const { fromYear, fromMonth, fromDate, toYear, toMonth, toDate } = dropdownProps;
            const { caption, name, value } = dropdownProps;
            
            let selectValues: { value: string; label: string }[] = [];
            if (name === "months") {
                selectValues = Array.from({ length: 12 }, (_, i) => ({
                    value: i.toString(),
                    label: format(new Date(new Date().getFullYear(), i, 1), "MMM"),
                }));
            } else if (name === "years") {
                const earliestYear = fromYear || fromMonth?.getFullYear() || fromDate?.getFullYear() || new Date().getFullYear() - 100;
                const latestYear = toYear || toMonth?.getFullYear() || toDate?.getFullYear() || new Date().getFullYear();
                if (earliestYear && latestYear) {
                    const years = [];
                    for (let i = latestYear; i >= earliestYear; i--) {
                        years.push({ value: i.toString(), label: i.toString() });
                    }
                    selectValues = years;
                }
            }
            
            const capitalizedName = name?.toString().charAt(0).toUpperCase() + name?.toString().slice(1);
            
            return (
                <Select
                    onValueChange={(newValue) => {
                        if (name === "months") {
                            const newDate = new Date(dropdownProps.displayMonth);
                            newDate.setMonth(parseInt(newValue));
                            dropdownProps.onChange?.(newDate);
                        } else if (name === "years") {
                            const newDate = new Date(dropdownProps.displayMonth);
                            newDate.setFullYear(parseInt(newValue));
                            dropdownProps.onChange?.(newDate);
                        }
                    }}
                    value={value?.toString()}
                >
                    <SelectTrigger className="h-8 shadow-none border-0 text-base font-medium focus:ring-0 w-[120px] justify-start capitalize">
                        <SelectValue placeholder={capitalizedName} />
                    </SelectTrigger>
                    <SelectContent>
                        <ScrollArea className="h-72">
                        {selectValues.map((selectValue) => (
                            <SelectItem key={selectValue.value} value={selectValue.value}>
                                {selectValue.label}
                            </SelectItem>
                        ))}
                        </ScrollArea>
                    </SelectContent>
                </Select>
            )
        }
      }}
      {...props}
    />
  )
}
// ===== EIND: Geïntegreerde DatePickerWithDropdowns component =====


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
    if (!user || !db) {
      return;
    }

    setIsLoading(true);

    const teamsQuery = query(
      collectionGroup(db, "teams"),
      where("invitationCode", "==", values.teamCode)
    );

    try {
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
      const teamData = teamDoc.data() as Team;
      
      const updatedProfile = {
        birthDate: values.birthDate.toISOString().split("T")[0],
        teamId: teamData.id,
        clubId: teamData.clubId, 
      };

      updateUserProfile({
        db,
        userId: user.uid,
        data: updatedProfile,
      });

      toast({
        title: "Profiel Bijgewerkt",
        description: "Je bent succesvol aan het team toegevoegd!",
      });
      
    } catch (queryError) {
      console.error("Error executing teams query:", queryError);
      const permissionError = new FirestorePermissionError({
        path: "teams",
        operation: "list",
      });
      errorEmitter.emit("permission-error", permissionError);
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
                  <DatePickerWithDropdowns
                    mode="single"
                    captionLayout="dropdown-buttons"
                    fromYear={new Date().getFullYear() - 25}
                    toYear={new Date().getFullYear() - 5}
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

