"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Loader2 } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  GRANULARITY_LABELS,
  RANGE_PRESETS,
  type Granularity,
  type RangeKey,
} from "@/lib/date-ranges";
import { cn } from "@/lib/utils";

type Props = {
  activeRange: RangeKey;
  activeGranularity: Granularity;
  allowedGranularities: Granularity[];
  from?: string;
  to?: string;
  /** Entity pages reuse the date presets but have no chart to bucket. */
  showGranularity?: boolean;
  /** Rendered on the right — current period label, run count, etc. */
  meta?: React.ReactNode;
};

const PRESET_KEYS = RANGE_PRESETS.filter((p) => p.key !== "custom");

export function FilterBar({
  activeRange,
  activeGranularity,
  allowedGranularities,
  from,
  to,
  showGranularity = true,
  meta,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  const [draft, setDraft] = React.useState<DateRange | undefined>(() => ({
    from: from ? parseDateKey(from) : undefined,
    to: to ? parseDateKey(to) : undefined,
  }));

  const push = React.useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams]
  );

  const selectPreset = (key: RangeKey) => {
    // Granularity is dropped so the server can pick the sensible default for
    // the new range; keeping "monthly" when switching to Today makes no sense.
    push({ range: key, granularity: null, from: null, to: null });
  };

  const applyCustom = () => {
    if (!draft?.from) return;
    const start = toDateKey(draft.from);
    const end = toDateKey(draft.to ?? draft.from);
    push({ range: "custom", from: start, to: end, granularity: null });
    setCalendarOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-background/80 px-4 py-2.5 backdrop-blur">
      {/* Presets */}
      <div className="flex flex-wrap items-center gap-1">
        {PRESET_KEYS.map((preset) => (
          <Button
            key={preset.key}
            type="button"
            size="xs"
            variant={activeRange === preset.key ? "default" : "ghost"}
            aria-pressed={activeRange === preset.key}
            onClick={() => selectPreset(preset.key)}
            className={cn(
              activeRange !== preset.key && "text-muted-foreground"
            )}
          >
            {preset.label}
          </Button>
        ))}

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="xs"
              variant={activeRange === "custom" ? "default" : "ghost"}
              aria-pressed={activeRange === "custom"}
              className={cn(
                activeRange !== "custom" && "text-muted-foreground"
              )}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {activeRange === "custom" && from
                ? formatCompact(from, to)
                : "Custom Range"}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-auto p-2">
            <Calendar
              mode="range"
              numberOfMonths={2}
              defaultMonth={draft?.from}
              selected={draft}
              onSelect={setDraft}
              disabled={{ after: new Date() }}
            />
            <div className="flex items-center justify-between gap-2 border-t border-border px-1 pt-2">
              <span className="text-2xs text-muted-foreground">
                {draft?.from
                  ? `${toDateKey(draft.from)} → ${toDateKey(draft.to ?? draft.from)}`
                  : "Pick a start date"}
              </span>
              <Button
                size="xs"
                onClick={applyCustom}
                disabled={!draft?.from}
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {showGranularity && (
        <>
          <div className="mx-1 hidden h-5 w-px bg-border sm:block" />

          <ToggleGroup
            type="single"
            value={activeGranularity}
            onValueChange={(value) => {
              if (value) push({ granularity: value });
            }}
            aria-label="Chart granularity"
          >
            {(["hourly", "daily", "monthly"] as Granularity[]).map((g) => (
              <ToggleGroupItem
                key={g}
                value={g}
                disabled={!allowedGranularities.includes(g)}
                title={
                  allowedGranularities.includes(g)
                    ? undefined
                    : `${GRANULARITY_LABELS[g]} isn't meaningful for this range`
                }
              >
                {GRANULARITY_LABELS[g]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </>
      )}

      <div className="ml-auto flex items-center gap-3">
        {pending && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
        )}
        {meta}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Date-key helpers                                                          */
/*                                                                            */
/*  The calendar deals in the browser's local Date objects; the URL carries    */
/*  bare yyyy-MM-dd keys. These convert without ever crossing a UTC boundary.  */
/* -------------------------------------------------------------------------- */

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(key: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function formatCompact(from: string, to?: string): string {
  const short = (key: string) => key.slice(5).replace("-", "/");
  return !to || to === from ? short(from) : `${short(from)}–${short(to)}`;
}
