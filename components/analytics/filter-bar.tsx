"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DateRange } from "react-day-picker";

import { useNavigation } from "@/components/motion/navigation-pending";
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
  /** True when no page header sits above this bar, so it is the topmost row. */
  topmost?: boolean;
  /** Bottom rule. Off when the content below should sit flush against it. */
  bordered?: boolean;
  /** Drops the bar's own padding so it can sit inside another flex row. */
  inline?: boolean;
  meta?: React.ReactNode;
};

const PRESET_KEYS = RANGE_PRESETS.filter((p) => p.key !== "custom");

/**
 * Plain text, rounded hit area, no fill or border. The selected option is a
 * brighter grey rather than bold white — the difference should read as "this
 * one", not as a highlighted box.
 */
const textLink = (active: boolean) =>
  cn(
    "rounded-full px-1 text-xs transition-colors",
    active ? "text-secondary" : "text-nav-muted hover:text-secondary"
  );

export function FilterBar({
  activeRange,
  activeGranularity,
  allowedGranularities,
  from,
  to,
  showGranularity = true,
  topmost = false,
  bordered = true,
  inline = false,
  meta,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Shared with the figures above, so they can dim while the fetch is in
  // flight instead of swapping instantly.
  const { startNavigation } = useNavigation();
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
      startNavigation(() => {
        router.push(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router, searchParams, startNavigation]
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
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-2",
        // Inline bars sit inside another row and bring no spacing of their own.
        !inline && "py-3 pr-6",
        !inline && bordered && "border-b border-border",
        // Left padding is owned by .topmost-bar when this is the first row on
        // the page, so it can clear the fixed mobile menu trigger.
        !inline && (topmost ? "topmost-bar" : "pl-6")
      )}
    >
      {/* Date presets — spacing alone separates them, no middots or rules. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {PRESET_KEYS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            aria-pressed={activeRange === preset.key}
            onClick={() => selectPreset(preset.key)}
            className={textLink(activeRange === preset.key)}
          >
            {preset.label}
          </button>
        ))}

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-pressed={activeRange === "custom"}
              className={textLink(activeRange === "custom")}
            >
              Custom Range
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
                // Matches the date presets exactly.
                className={cn(
                  "rounded-full px-1 text-xs transition-colors",
                  active && "text-secondary",
                  !active && allowed && "text-nav-muted hover:text-secondary",
                  !allowed && "cursor-not-allowed text-nav-muted opacity-40"
                )}
              >
                {GRANULARITY_LABELS[g]}
              </button>
            );
          })}
        </div>
      )}

      {meta && <div className="ml-auto flex items-center pl-4">{meta}</div>}
    </div>
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
