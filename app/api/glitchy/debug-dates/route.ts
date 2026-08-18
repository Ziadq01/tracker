import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";
import { shiftDateKey, toDateKey } from "@/lib/date-ranges";

export const dynamic = "force-dynamic";

/**
 * Read-only. Reports what the archive actually holds per day, next to the
 * date keys the sync route derives, so a mismatch between the two is visible
 * rather than inferred.
 */
export async function GET() {
  const supabase = getSupabase();

  const today = toDateKey(new Date());
  const derived = {
    serverNowUTC: new Date().toISOString(),
    appToday: today,
    appYesterday: shiftDateKey(today, -1),
  };

  if (!supabase) {
    return NextResponse.json({
      derived,
      supabaseConfigured: false,
      note: "getSupabase() returned null — archive reads fall through to Glitchy",
    });
  }

  const since = shiftDateKey(today, -9);
  const { data, error } = await supabase
    .from("glitchy_stats")
    .select("date, source, payout, clicks")
    .gte("date", since);

  if (error) {
    return NextResponse.json({ derived, supabaseConfigured: true, error: error.message });
  }

  const byDate: Record<string, { rows: number; revenue: number; clicks: number; sources: string[] }> = {};
  for (const r of data ?? []) {
    const d = r.date as string;
    if (!byDate[d]) byDate[d] = { rows: 0, revenue: 0, clicks: 0, sources: [] };
    byDate[d].rows++;
    byDate[d].revenue += Number(r.payout) || 0;
    byDate[d].clicks += Number(r.clicks) || 0;
    const s = (r.source as string) || "unknown";
    if (!byDate[d].sources.includes(s)) byDate[d].sources.push(s);
  }

  const days = Object.entries(byDate)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, v]) => ({
      date,
      rows: v.rows,
      revenue: Number(v.revenue.toFixed(2)),
      clicks: v.clicks,
      sources: v.sources,
    }));

  return NextResponse.json({ derived, supabaseConfigured: true, days });
}
