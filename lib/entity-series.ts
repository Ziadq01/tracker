import "server-only";

import { shiftDateKey } from "@/lib/date-ranges";
import type { Period } from "@/lib/date-ranges";
import { getSupabase } from "@/lib/supabase/server";

/**
 * Per-entity daily series for the row-level mini charts.
 *
 * A new, additive read — it does not change the shape of any existing query.
 * It fetches only the columns the sparklines need, keyed by creative, and the
 * offer version rolls those up through creatives.
 */

export type DailyPoint = { revenue: number; spend: number; profit: number };

/** Ordered date keys spanning a period, oldest first. */
export function dateKeysIn(period: Period): string[] {
  const keys: string[] = [];
  let cursor = period.startDate;
  for (let i = 0; i < 400 && cursor <= period.endDate; i += 1) {
    keys.push(cursor);
    cursor = shiftDateKey(cursor, 1);
  }
  return keys;
}

const num = (v: number | string | null | undefined) => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
};

type Row = {
  creative_id: string | null;
  run_date: string;
  ad_spend: number | string | null;
  revenue: number | string | null;
};

/** Daily revenue/spend/profit per creative across the period. */
export async function getCreativeDailySeries(
  period: Period
): Promise<Map<string, DailyPoint[]>> {
  const out = new Map<string, DailyPoint[]>();
  const supabase = getSupabase();
  if (!supabase) return out;

  const keys = dateKeysIn(period);
  const slot = new Map(keys.map((key, index) => [key, index]));

  const { data, error } = await supabase
    .from("runs")
    .select("creative_id, run_date, ad_spend, revenue")
    .gte("run_date", period.startDate)
    .lte("run_date", period.endDate);

  if (error) return out;

  for (const raw of data ?? []) {
    const row = raw as Row;
    if (!row.creative_id) continue;
    const index = slot.get(row.run_date);
    if (index === undefined) continue;

    let bucket = out.get(row.creative_id);
    if (!bucket) {
      bucket = keys.map(() => ({ revenue: 0, spend: 0, profit: 0 }));
      out.set(row.creative_id, bucket);
    }
    const revenue = num(row.revenue);
    const spend = num(row.ad_spend);
    bucket[index].revenue += revenue;
    bucket[index].spend += spend;
    bucket[index].profit += revenue - spend;
  }

  return out;
}

/**
 * Daily series per offer, rolled up from its creatives' runs so the chart
 * matches the revenue/spend/profit columns beside it.
 */
export async function getOfferDailySeries(
  period: Period
): Promise<Map<string, DailyPoint[]>> {
  const out = new Map<string, DailyPoint[]>();
  const supabase = getSupabase();
  if (!supabase) return out;

  const [byCreative, creativesRes] = await Promise.all([
    getCreativeDailySeries(period),
    supabase.from("creatives").select("id, offer_id"),
  ]);

  if (creativesRes.error) return out;

  const keys = dateKeysIn(period);

  for (const raw of creativesRes.data ?? []) {
    const { id, offer_id: offerId } = raw as {
      id: string;
      offer_id: string | null;
    };
    if (!offerId) continue;

    const series = byCreative.get(id);
    if (!series) continue;

    let bucket = out.get(offerId);
    if (!bucket) {
      bucket = keys.map(() => ({ revenue: 0, spend: 0, profit: 0 }));
      out.set(offerId, bucket);
    }
    for (let i = 0; i < bucket.length && i < series.length; i += 1) {
      bucket[i].revenue += series[i].revenue;
      bucket[i].spend += series[i].spend;
      bucket[i].profit += series[i].profit;
    }
  }

  return out;
}

/** Newest and oldest run timestamps per creative, for the time columns. */
export async function getCreativeActivity(
  period: Period
): Promise<Map<string, { first: string; last: string }>> {
  const out = new Map<string, { first: string; last: string }>();
  const supabase = getSupabase();
  if (!supabase) return out;

  const { data, error } = await supabase
    .from("runs")
    .select("creative_id, created_at")
    .gte("run_date", period.startDate)
    .lte("run_date", period.endDate);

  if (error) return out;

  for (const raw of data ?? []) {
    const row = raw as { creative_id: string | null; created_at: string | null };
    if (!row.creative_id || !row.created_at) continue;

    const existing = out.get(row.creative_id);
    if (!existing) {
      out.set(row.creative_id, { first: row.created_at, last: row.created_at });
    } else {
      if (row.created_at < existing.first) existing.first = row.created_at;
      if (row.created_at > existing.last) existing.last = row.created_at;
    }
  }

  return out;
}
