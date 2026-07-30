"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  showGranularity?: boolean;
  meta?: React.ReactNode;
};

const PRESET_KEYS = RANGE_PRESETS.filter((p) => p.key !== "custom");

/** Active = bold foreground. Inactive = secondary. No pill, border, or fill. */
const textLink = (active: boolean) =>
  cn(
    "text-xs transition-colors",
    active ? "font-bold text-foreground" : "text-secondary hover:text-foreground"
  );

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
  const [, startTransition] = React.useTransition();
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
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border px-6 py-3">
      {/* Date presets, separated by middots. */}
      <div className="flex flex-wrap items-center">
        {PRESET_KEYS.map((preset, index) => (
          <React.Fragment key={preset.key}>
            {index > 0 && <Separator />}
            <button
              type="button"
              aria-pressed={activeRange === preset.key}
              onClick={() => selectPreset(preset.key)}
              className={textLink(activeRange === preset.key)}
            >
              {preset.label}
            </button>
          </React.Fragment>
        ))}

        <Separator />

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-pressed={activeRange === "custom"}
              className={textLink(activeRange === "custom")}
            >
              {activeRange === "custom" && from
                ? formatCompact(from, to)
                : "Custom Range"}
            </button>
          </PopoverTrigger>

          <PopoverContent className="w-auto">
            <Calendar
              mode="range"
              numberOfMonths={2}
              defaultMonth={draft?.from}
              selected={draft}
              onSelect={setDraft}
              disabled={{ after: new Date() }}
            />
            <div className="mt-2 flex items-center justify-between gap-4 border-t border-border pt-2">
              <span className="text-2xs text-secondary">
                {draft?.from
                  ? `${toDateKey(draft.from)} → ${toDateKey(draft.to ?? draft.from)}`
                  : "Pick a start date"}
              </span>
              <Button
                variant="solid"
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
        <div
          className="flex items-center gap-4"
          role="group"
          aria-label="Chart granularity"
        >
          {(["hourly", "daily", "monthly"] as Granularity[]).map((g) => {
            const allowed = allowedGranularities.includes(g);
            const active = activeGranularity === g;
            return (
              <button
                key={g}
                type="button"
                disabled={!allowed}
                aria-pressed={active}
                onClick={() => push({ granularity: g })}
                title={
                  allowed
                    ? undefined
                    : `${GRANULARITY_LABELS[g]} isn't meaningful for this range`
                }
                className={cn(
                  "text-xs underline-offset-4 transition-colors",
                  active && "font-bold text-foreground underline",
                  !active && allowed && "text-secondary hover:text-foreground",
                  !allowed && "cursor-not-allowed text-secondary opacity-40"
                )}
              >
                {GRANULARITY_LABELS[g]}
              </button>
            );
          })}
        </div>
      )}

      {meta && <div className="ml-auto flex items-center">{meta}</div>}
    </div>
  );
}

function Separator() {
  return (
    <span aria-hidden className="px-2 text-xs text-secondary">
      ·
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Date-key helpers (unchanged behaviour)                                    */
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
