import { addDays, differenceInCalendarDays, parseISO } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/**
 * Every date boundary in Scaler is resolved in one configured timezone, not the
 * server's. Vercel runs in UTC; a buyer asking for "Today" means their trading
 * day, not UTC's.
 */
export const APP_TIMEZONE =
  process.env.NEXT_PUBLIC_APP_TIMEZONE || "Africa/Casablanca";

export type RangeKey =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "custom";

export type Granularity = "hourly" | "daily" | "monthly";

export type Period = {
  /** Inclusive business dates (yyyy-MM-dd) — used to filter `runs.run_date`. */
  startDate: string;
  endDate: string;
  /** Half-open UTC instants [startAt, endAt) — used to filter `runs.created_at`. */
  startAt: Date;
  endAt: Date;
};

export type ResolvedRange = {
  key: RangeKey;
  label: string;
  current: Period;
  previous: Period;
  /**
   * True when the window is narrower than a day. `runs.run_date` has no
   * intra-day resolution, so these ranges filter on `created_at` instead.
   */
  intraday: boolean;
  granularity: Granularity;
  allowedGranularities: Granularity[];
};

export const RANGE_PRESETS: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7D" },
  { key: "30d", label: "30D" },
  { key: "custom", label: "Custom Range" },
];

/* -------------------------------------------------------------------------- */
/*  Timezone helpers                                                          */
/* -------------------------------------------------------------------------- */

/** yyyy-MM-dd for an instant, in the app timezone. */
export function toDateKey(instant: Date, timeZone = APP_TIMEZONE): string {
  return formatInTimeZone(instant, timeZone, "yyyy-MM-dd");
}

/** The UTC instant at which a given wall-clock date starts in the app timezone. */
function startOfDateKey(dateKey: string, timeZone = APP_TIMEZONE): Date {
  return fromZonedTime(`${dateKey}T00:00:00`, timeZone);
}

/** Shift a yyyy-MM-dd key by whole days without tripping over DST. */
export function shiftDateKey(dateKey: string, days: number): string {
  return formatInTimeZone(
    addDays(parseISO(`${dateKey}T12:00:00Z`), days),
    "UTC",
    "yyyy-MM-dd"
  );
}

function daySpan(startDate: string, endDate: string): Period {
  return {
    startDate,
    endDate,
    startAt: startOfDateKey(startDate),
    // exclusive: midnight at the start of the day *after* endDate
    endAt: startOfDateKey(shiftDateKey(endDate, 1)),
  };
}

/* -------------------------------------------------------------------------- */
/*  Resolution                                                                */
/* -------------------------------------------------------------------------- */

function resolveGranularity(
  requested: string | undefined,
  allowed: Granularity[]
): Granularity {
  if (requested && allowed.includes(requested as Granularity)) {
    return requested as Granularity;
  }
  return allowed[0];
}

export type RangeInput = {
  range?: string;
  from?: string;
  to?: string;
  granularity?: string;
  /** Injectable for tests. */
  now?: Date;
};

export function resolveRange(input: RangeInput = {}): ResolvedRange {
  const now = input.now ?? new Date();
  const key = (RANGE_PRESETS.find((p) => p.key === input.range)?.key ??
    "today") as RangeKey;

  const today = toDateKey(now);

  switch (key) {
    case "yesterday": {
      const y = shiftDateKey(today, -1);
      const allowed: Granularity[] = ["hourly", "daily"];
      return {
        key,
        label: "Yesterday",
        intraday: false,
        current: daySpan(y, y),
        previous: (() => {
          const p = shiftDateKey(y, -1);
          return daySpan(p, p);
        })(),
        granularity: resolveGranularity(input.granularity, allowed),
        allowedGranularities: allowed,
      };
    }

    case "7d": {
      const start = shiftDateKey(today, -6);
      const allowed: Granularity[] = ["daily", "hourly", "monthly"];
      return {
        key,
        label: "Last 7 Days",
        intraday: false,
        current: daySpan(start, today),
        previous: daySpan(shiftDateKey(start, -7), shiftDateKey(start, -1)),
        granularity: resolveGranularity(input.granularity, allowed),
        allowedGranularities: allowed,
      };
    }

    case "30d": {
      const start = shiftDateKey(today, -29);
      const allowed: Granularity[] = ["daily", "monthly"];
      return {
        key,
        label: "Last 30 Days",
        intraday: false,
        current: daySpan(start, today),
        previous: daySpan(shiftDateKey(start, -30), shiftDateKey(start, -1)),
        granularity: resolveGranularity(input.granularity, allowed),
        allowedGranularities: allowed,
      };
    }

    case "custom": {
      const isDateKey = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
      let start = isDateKey(input.from) ? input.from! : shiftDateKey(today, -6);
      let end = isDateKey(input.to) ? input.to! : today;
      if (start > end) [start, end] = [end, start];

      const lengthDays =
        differenceInCalendarDays(
          parseISO(`${end}T12:00:00Z`),
          parseISO(`${start}T12:00:00Z`)
        ) + 1;

      const allowed: Granularity[] =
        lengthDays <= 2
          ? ["hourly", "daily"]
          : lengthDays > 90
            ? ["monthly", "daily"]
            : ["daily", "monthly"];

      return {
        key,
        label:
          start === end
            ? formatDateKeyLabel(start)
            : `${formatDateKeyLabel(start)} – ${formatDateKeyLabel(end)}`,
        intraday: false,
        current: daySpan(start, end),
        previous: daySpan(
          shiftDateKey(start, -lengthDays),
          shiftDateKey(start, -1)
        ),
        granularity: resolveGranularity(input.granularity, allowed),
        allowedGranularities: allowed,
      };
    }

    case "today":
    default: {
      const allowed: Granularity[] = ["hourly", "daily"];
      const y = shiftDateKey(today, -1);
      return {
        key: "today",
        label: "Today",
        intraday: false,
        current: daySpan(today, today),
        previous: daySpan(y, y),
        granularity: resolveGranularity(input.granularity, allowed),
        allowedGranularities: allowed,
      };
    }
  }
}

/* -------------------------------------------------------------------------- */
/*  Labels                                                                    */
/* -------------------------------------------------------------------------- */

export function formatDateKeyLabel(dateKey: string): string {
  return formatInTimeZone(parseISO(`${dateKey}T12:00:00Z`), "UTC", "MMM d");
}

export function formatPeriodLabel(period: Period): string {
  return period.startDate === period.endDate
    ? formatDateKeyLabel(period.startDate)
    : `${formatDateKeyLabel(period.startDate)} – ${formatDateKeyLabel(period.endDate)}`;
}

export const GRANULARITY_LABELS: Record<Granularity, string> = {
  hourly: "Hourly",
  daily: "Daily",
  monthly: "Monthly",
};
