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
 * Plain text, no fill and no border in either state. Weight and colour are the
 * whole difference: the selected option goes full-contrast foreground at 600,
 * everything else sits at the muted grey.
 */
const textLink = (active: boolean) =>
  cn(
    // shrink-0 keeps each option on one line inside the scrolling strip;
    // min-h gives a 44px tap target on a phone without a visible box.
    "inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap px-1 text-xs transition-colors md:min-h-0",
    active
      ? "font-semibold text-foreground"
      : "text-nav-muted hover:text-secondary"
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
  const wide = useWideViewport();

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
        // One row that scrolls sideways on a phone, wrapping only from md up —
        // a phone should never see these options on two lines.
        "scroll-x flex flex-nowrap items-center gap-x-4 md:flex-wrap md:gap-x-5 md:gap-y-2 md:overflow-x-visible",
        // Inline bars sit inside another row and bring no spacing of their own.
        !inline && "py-1 pr-4 md:py-3 md:pr-6",
        !inline && bordered && "border-b border-border",
        // Left padding is owned by .topmost-bar when this is the first row on
        // the page, so it can clear the fixed mobile menu trigger.
        !inline && (topmost ? "topmost-bar" : "pl-4 md:pl-6")
      )}
    >
      {/* Date presets — spacing alone separates them, no middots or rules. */}
      <div className="flex flex-nowrap items-center gap-x-4 md:flex-wrap md:gap-y-1">
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

          <PopoverContent className="w-auto max-w-[calc(100vw-1rem)]">
            {/* Two months never fit a phone's width, so it drops to one. */}
            <Calendar
              mode="range"
              numberOfMonths={wide ? 2 : 1}
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
                className="min-h-[44px] px-4 md:min-h-0 md:px-2"
              >
                Apply
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <button
        type="button"
        onClick={() => {
          startNavigation(() => {
            router.push("/calendar");
          });
        }}
        className={textLink(pathname === "/calendar")}
      >
        Analytics
      </button>

      <button
        type="button"
        onClick={() => {
          startNavigation(() => {
            router.refresh();
          });
        }}
        title="Refresh data"
        className="inline-flex min-h-[44px] shrink-0 items-center justify-center px-1 text-secondary transition-colors hover:text-foreground md:min-h-0"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
          <path d="M16 21h5v-5" />
        </svg>
      </button>

      {meta && <div className="ml-auto flex items-center pl-4">{meta}</div>}
    </div>
  );
}

/**
 * Tracks the same 768px breakpoint the CSS uses, for the one decision CSS
 * cannot make: how many months react-day-picker should render. Starts false so
 * the server and the first client render agree; the calendar only mounts on a
 * user gesture, long after this has settled.
 */
function useWideViewport(): boolean {
  const [wide, setWide] = React.useState(false);

  React.useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return wide;
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
