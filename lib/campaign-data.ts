import "server-only";

import { formatInTimeZone } from "date-fns-tz";

import type { CampaignSettings, FlagStatus } from "@/lib/campaign-ui";
import { shiftDateKey, toDateKey } from "@/lib/date-ranges";
import { getSupabase } from "@/lib/supabase/server";

/**
 * Reads for the campaign controls added in
 * supabase/migrations/0001_campaign_controls.sql.
 *
 * Deliberately separate from lib/queries.ts: the existing queries and metric
 * calculations are untouched, and these only fetch columns that did not exist
 * before.
 */

const asFlag = (value: unknown): FlagStatus =>
  value === "testing" || value === "scaling" ? value : "none";

/**
 * Per-creative budget / star / flag state.
 *
 * If the migration hasn't been applied yet the select fails on the unknown
 * columns; rather than break the page we fall back to defaults and surface a
 * hint. Everything else on the page still renders.
 */
export async function getCampaignSettings(): Promise<{
  settings: Map<string, CampaignSettings>;
  migrationMissing: boolean;
}> {
  const supabase = getSupabase();
  const settings = new Map<string, CampaignSettings>();
  if (!supabase) return { settings, migrationMissing: false };

  const { data, error } = await supabase
    .from("creatives")
    .select("id, daily_budget, is_starred, flag_status");

  if (error) {
    // 42703 = undefined_column
    const missing =
      error.code === "42703" || /column .* does not exist/i.test(error.message);
    return { settings, migrationMissing: missing };
  }

  for (const row of data ?? []) {
    const record = row as {
      id: string;
      daily_budget: number | string | null;
      is_starred: boolean | null;
      flag_status: string | null;
    };
    settings.set(record.id, {
      dailyBudget: Number(record.daily_budget ?? 0) || 0,
      isStarred: Boolean(record.is_starred),
      flagStatus: asFlag(record.flag_status),
    });
  }

  return { settings, migrationMissing: false };
}

/* -------------------------------------------------------------------------- */
/*  Sparklines                                                                */
/* -------------------------------------------------------------------------- */

export const SPARKLINE_DAYS = 7;

/**
 * Trailing 7 days of revenue per creative, independent of the page's selected
 * range — the sparkline is always "last 7 days" even when the filter says Today.
 */
export async function getSparklines(
  now = new Date()
): Promise<Map<string, number[]>> {
  const series = new Map<string, number[]>();
  const supabase = getSupabase();
  if (!supabase) return series;

  const today = toDateKey(now);
  const start = shiftDateKey(today, -(SPARKLINE_DAYS - 1));

  const { data, error } = await supabase
    .from("runs")
    .select("creative_id, run_date, revenue")
    .gte("run_date", start)
    .lte("run_date", today);

  if (error) return series;

  // Index of each date in the 7-slot output array.
  const slot = new Map<string, number>();
  for (let i = 0; i < SPARKLINE_DAYS; i += 1) {
    slot.set(shiftDateKey(start, i), i);
  }

  for (const row of data ?? []) {
    const record = row as {
      creative_id: string | null;
      run_date: string;
      revenue: number | string | null;
    };
    if (!record.creative_id) continue;

    const index = slot.get(record.run_date);
    if (index === undefined) continue;

    let bucket = series.get(record.creative_id);
    if (!bucket) {
      bucket = new Array<number>(SPARKLINE_DAYS).fill(0);
      series.set(record.creative_id, bucket);
    }
    bucket[index] += Number(record.revenue ?? 0) || 0;
  }

  return series;
}

/** Local-date label for a run, used in the expanded breakdown. */
export function formatRunDate(dateKey: string): string {
  return formatInTimeZone(new Date(`${dateKey}T12:00:00Z`), "UTC", "MMM d");
}
