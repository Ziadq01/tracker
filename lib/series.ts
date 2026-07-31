import { addMinutes, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import {
  APP_TIMEZONE,
  shiftDateKey,
  type Granularity,
  type Period,
  type ResolvedRange,
} from "@/lib/date-ranges";
import {
  deriveMetrics,
  sumRuns,
  type MetricTotals,
  type RunLike,
} from "@/lib/metrics";

/**
 * Bucketing rules, and why they differ by unit:
 *
 * `runs.run_date` is a DATE — it has no intra-day resolution. So anything
 * finer than a day has to bucket on `created_at`, the only real timestamp in
 * the schema. Day and month buckets use `run_date`, which is the business date
 * a run belongs to regardless of when the row landed.
 */
export type BucketUnit = "minute5" | "hour" | "day" | "month";

export type SeriesPoint = {
  /** X-axis label, shared by both periods (they're aligned by index). */
  label: string;
  current: number | null;
  previous: number | null;
  currentLabel: string;
  previousLabel: string;
};

export type BucketedTotals = {
  key: string;
  label: string;
  totals: MetricTotals;
};

function bucketUnitFor(range: ResolvedRange, granularity: Granularity): BucketUnit {
  if (granularity === "monthly") return "month";
  if (granularity === "daily") return "day";
  // hourly — but an hour-long window needs something finer than one point.
  return range.key === "hour" ? "minute5" : "hour";
}

export const BUCKET_DESCRIPTION: Record<BucketUnit, string> = {
  minute5: "5-minute buckets",
  hour: "hourly buckets",
  day: "daily buckets",
  month: "monthly buckets",
};

/* -------------------------------------------------------------------------- */
/*  Bucket generation                                                         */
/* -------------------------------------------------------------------------- */

type Bucket = { key: string; label: string };

function generateBuckets(period: Period, unit: BucketUnit): Bucket[] {
  switch (unit) {
    case "minute5": {
      const buckets: Bucket[] = [];
      let cursor = period.startAt;
      while (cursor < period.endAt) {
        buckets.push({
          key: cursor.toISOString(),
          label: formatInTimeZone(cursor, APP_TIMEZONE, "HH:mm"),
        });
        cursor = addMinutes(cursor, 5);
      }
      return buckets;
    }

    case "hour": {
      const buckets: Bucket[] = [];
      let cursor = period.startAt;
      while (cursor < period.endAt) {
        buckets.push({
          key: formatInTimeZone(cursor, APP_TIMEZONE, "yyyy-MM-dd'T'HH"),
          label: formatInTimeZone(cursor, APP_TIMEZONE, "HH:mm"),
        });
        cursor = addMinutes(cursor, 60);
      }
      return buckets;
    }

    case "day": {
      const buckets: Bucket[] = [];
      let cursor = period.startDate;
      // Guard against a pathological range spinning forever.
      for (let i = 0; i < 800 && cursor <= period.endDate; i += 1) {
        buckets.push({
          key: cursor,
          label: formatInTimeZone(
            parseISO(`${cursor}T12:00:00Z`),
            "UTC",
            "MMM d"
          ),
        });
        cursor = shiftDateKey(cursor, 1);
      }
      return buckets;
    }

    case "month": {
      const buckets: Bucket[] = [];
      const seen = new Set<string>();
      let cursor = period.startDate;
      for (let i = 0; i < 800 && cursor <= period.endDate; i += 1) {
        const key = cursor.slice(0, 7);
        if (!seen.has(key)) {
          seen.add(key);
          buckets.push({
            key,
            label: formatInTimeZone(
              parseISO(`${key}-01T12:00:00Z`),
              "UTC",
              "MMM yyyy"
            ),
          });
        }
        cursor = shiftDateKey(cursor, 1);
      }
      return buckets;
    }
  }
}

/** Which bucket does this run fall into? */
function bucketKeyForRun(run: RunRow, unit: BucketUnit): string | null {
  switch (unit) {
    case "minute5": {
      if (!run.created_at) return null;
      const at = new Date(run.created_at);
      if (Number.isNaN(at.getTime())) return null;
      const floored = new Date(
        Math.floor(at.getTime() / (5 * 60_000)) * (5 * 60_000)
      );
      return floored.toISOString();
    }
    case "hour": {
      if (!run.created_at) return null;
      const at = new Date(run.created_at);
      if (Number.isNaN(at.getTime())) return null;
      return formatInTimeZone(at, APP_TIMEZONE, "yyyy-MM-dd'T'HH");
    }
    case "day":
      return run.run_date ?? null;
    case "month":
      return run.run_date ? run.run_date.slice(0, 7) : null;
  }
}

type RunRow = RunLike & { run_date: string; created_at: string | null };

/** Group runs into the buckets of a period, preserving empty buckets. */
export function bucketRuns(
  runs: RunRow[],
  period: Period,
  unit: BucketUnit
): BucketedTotals[] {
  const buckets = generateBuckets(period, unit);
  const index = new Map<string, RunRow[]>();

  for (const run of runs) {
    const key = bucketKeyForRun(run, unit);
    if (key === null) continue;
    const existing = index.get(key);
    if (existing) existing.push(run);
    else index.set(key, [run]);
  }

  return buckets.map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    totals: sumRuns(index.get(bucket.key) ?? []),
  }));
}

/* -------------------------------------------------------------------------- */
/*  Dual-period series                                                        */
/* -------------------------------------------------------------------------- */

export type MetricKey =
  | "revenue"
  | "adSpend"
  | "profit"
  | "tiktokClicks"
  | "networkClicks";

function valueFor(totals: MetricTotals, metric: MetricKey): number {
  if (metric === "profit") return deriveMetrics(totals).profit;
  return totals[metric];
}

/**
 * Build the overlay series. Current and previous periods are aligned by bucket
 * *index*, not by timestamp — that is the whole point of the comparison: hour 3
 * of today sits on top of hour 3 of yesterday.
 *
 * Trailing buckets of the current period that haven't happened yet stay `null`
 * so Recharts draws no line there rather than a drop to zero.
 */
export function buildComparisonSeries(opts: {
  currentRuns: RunRow[];
  previousRuns: RunRow[];
  range: ResolvedRange;
  metric?: MetricKey;
  now?: Date;
}): { points: SeriesPoint[]; unit: BucketUnit } {
  const { currentRuns, previousRuns, range, metric = "revenue" } = opts;
  const now = opts.now ?? new Date();
  const unit = bucketUnitFor(range, range.granularity);

  const currentBuckets = bucketRuns(currentRuns, range.current, unit);
  const previousBuckets = bucketRuns(previousRuns, range.previous, unit);

  const length = Math.max(currentBuckets.length, previousBuckets.length);
  const points: SeriesPoint[] = [];

  for (let i = 0; i < length; i += 1) {
    const cur = currentBuckets[i];
    const prev = previousBuckets[i];

    points.push({
      label: cur?.label ?? prev?.label ?? "",
      current: cur ? valueFor(cur.totals, metric) : null,
      previous: prev ? valueFor(prev.totals, metric) : null,
      currentLabel: cur?.label ?? "",
      previousLabel: prev?.label ?? "",
    });
  }

  // Blank out current-period buckets that are still in the future.
  const futureFrom = futureBucketIndex(currentBuckets, unit, now);
  if (futureFrom !== null) {
    for (let i = futureFrom; i < points.length; i += 1) {
      points[i].current = null;
    }
  }

  return { points, unit };
}

/** Index of the first bucket that starts after `now`, or null if none do. */
function futureBucketIndex(
  buckets: BucketedTotals[],
  unit: BucketUnit,
  now: Date
): number | null {
  const nowKey =
    unit === "minute5"
      ? new Date(
          Math.floor(now.getTime() / (5 * 60_000)) * (5 * 60_000)
        ).toISOString()
      : unit === "hour"
        ? formatInTimeZone(now, APP_TIMEZONE, "yyyy-MM-dd'T'HH")
        : unit === "day"
          ? formatInTimeZone(now, APP_TIMEZONE, "yyyy-MM-dd")
          : formatInTimeZone(now, APP_TIMEZONE, "yyyy-MM");

  for (let i = 0; i < buckets.length; i += 1) {
    if (buckets[i].key > nowKey) return i;
  }
  return null;
}
