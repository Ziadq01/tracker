import "server-only";

import { formatInTimeZone } from "date-fns-tz";

import { shiftDateKey, type Period } from "@/lib/date-ranges";
import type { DualPoint } from "@/lib/dual-series";
import { getSupabase } from "@/lib/supabase/server";

/**
 * Per-offer daily series and BC account rollups.
 *
 * Additive reads — they select only the columns these views need and leave the
 * shape of every existing query alone.
 */

/** Ordered date keys spanning a period, oldest first. */
function dateKeysIn(period: Period): string[] {
  const keys: string[] = [];
  let cursor = period.startDate;
  for (let i = 0; i < 400 && cursor <= period.endDate; i += 1) {
    keys.push(cursor);
    cursor = shiftDateKey(cursor, 1);
  }
  return keys;
}

const labelFor = (dateKey: string) =>
  formatInTimeZone(new Date(`${dateKey}T12:00:00Z`), "UTC", "MMM d");

const num = (v: number | string | null | undefined) => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
};

/**
 * Daily revenue and network clicks per offer, rolled up through creatives so
 * the chart matches the revenue and spend figures beside it.
 */
export async function getOfferSeries(
  period: Period
): Promise<Map<string, DualPoint[]>> {
  const out = new Map<string, DualPoint[]>();
  const supabase = getSupabase();
  if (!supabase) return out;

  const keys = dateKeysIn(period);
  const slot = new Map(keys.map((key, index) => [key, index]));

  const [runsRes, creativesRes] = await Promise.all([
    supabase
      .from("runs")
      .select("creative_id, run_date, revenue, network_clicks")
      .gte("run_date", period.startDate)
      .lte("run_date", period.endDate),
    supabase.from("creatives").select("id, offer_id"),
  ]);

  if (runsRes.error || creativesRes.error) return out;

  const creativeToOffer = new Map<string, string>();
  for (const raw of creativesRes.data ?? []) {
    const row = raw as { id: string; offer_id: string | null };
    if (row.offer_id) creativeToOffer.set(row.id, row.offer_id);
  }

  const blank = () =>
    keys.map<DualPoint>((key) => ({
      label: labelFor(key),
      revenue: 0,
      clicks: 0,
    }));

  for (const raw of runsRes.data ?? []) {
    const row = raw as {
      creative_id: string | null;
      run_date: string;
      revenue: number | string | null;
      network_clicks: number | string | null;
    };
    if (!row.creative_id) continue;

    const offerId = creativeToOffer.get(row.creative_id);
    if (!offerId) continue;

    const index = slot.get(row.run_date);
    if (index === undefined) continue;

    let bucket = out.get(offerId);
    if (!bucket) {
      bucket = blank();
      out.set(offerId, bucket);
    }
    bucket[index].revenue = (bucket[index].revenue ?? 0) + num(row.revenue);
    bucket[index].clicks = (bucket[index].clicks ?? 0) + num(row.network_clicks);
  }

  return out;
}
