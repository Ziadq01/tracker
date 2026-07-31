"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-1", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-5",
        month: "space-y-3",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-xs font-medium text-foreground",
        nav: "flex items-center",
        nav_button:
          "h-6 w-6 inline-flex items-center justify-center text-secondary hover:text-foreground transition-colors",
        nav_button_previous: "absolute left-0",
        nav_button_next: "absolute right-0",
        table: "w-full border-collapse",
        head_row: "flex",
        head_cell:
          "w-8 text-2xs font-normal uppercase tracking-header text-secondary",
        row: "flex w-full mt-1",
        cell: "relative p-0 text-center text-xs",
        // Selected days keep the foreground text colour on a medium gray fill,
        // so the date number stays readable. `outline-none` kills the UA's blue
        // focus ring; keyboard focus is carried by a foreground-coloured ring
        // instead, so the indicator survives without introducing a hue.
        day: cn(
          "h-8 w-8 p-0 font-normal text-foreground rounded-md transition-colors",
          "hover:bg-hover outline-none focus-visible:ring-1 focus-visible:ring-foreground"
        ),
        day_range_start: "bg-calendar-selected text-foreground",
        day_range_end: "bg-calendar-selected text-foreground",
        day_selected:
          "bg-calendar-selected text-foreground hover:bg-calendar-selected",
        day_today: "underline underline-offset-2",
        day_outside: "text-secondary opacity-40",
        day_disabled: "text-secondary opacity-30",
        day_range_middle: "bg-surface text-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        // Text chevrons rather than icons — the theme switch is the only icon.
        IconLeft: () => <span aria-hidden>&lsaquo;</span>,
        IconRight: () => <span aria-hidden>&rsaquo;</span>,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
