"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, DropdownProps } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"
import { ScrollArea } from "./scroll-area"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function DatePickerWithDropdowns({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
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
        Dropdown: (props: DropdownProps) => {
            const { fromYear, fromMonth, fromDate } = props;
            const { toYear, toMonth, toDate } = props;
            const {
                caption,
                name,
                value
            } = props;

            let selectValues: { value: string; label: string }[] = [];
            if (name === "months") {
                selectValues = Array.from({ length: 12 }, (_, i) => {
                    return {
                        value: i.toString(),
                        label: format(new Date(new Date().getFullYear(), i, 1), "MMM"),
                    };
                });
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
                            const newDate = new Date(props.displayMonth);
                            newDate.setMonth(parseInt(newValue));
                            props.onChange?.(newDate);
                        } else if (name === "years") {
                            const newDate = new Date(props.displayMonth);
                            newDate.setFullYear(parseInt(newValue));
                            props.onChange?.(newDate);
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
DatePickerWithDropdowns.displayName = "DatePickerWithDropdowns"

// Helper function to format dates, as it might not be globally available
function format(date: Date, formatStr: string): string {
    const months = ["Jan", "Feb", "Mrt", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];
    if (formatStr === "MMM") {
        return months[date.getMonth()];
    }
    return date.toLocaleDateString(); // Fallback
}


export { DatePickerWithDropdowns }
