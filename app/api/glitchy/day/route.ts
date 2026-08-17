import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type DayBreakdownRow = {
  key: string;
  label: string;
  revenue: number;
  clicks: number;
  conversions: number;
  epc: number | null;
  cvr: number | null;
};

export type DayBreakdown = {
  date: string;
  totalRevenue: number;
  totalClicks: number;
  totalConversions: number;
  epc: number | null;
  cvr: number | null;
  sources: DayBreakdownRow[];
  offers: DayBreakdownRow[];
  error?: string;
};

type Bucket = { revenue: number; clicks: number; conversions: number };

function divide(a: number, b: number): number | null {
  return b > 0 ? a / b : null;
}

function toRows(
  buckets: Record<string, Bucket & { label: string }>
): DayBreakdownRow[] {
  return Object.entries(buckets)
    .map(([key, v]) => ({
      key,
      label: v.label,
      revenue: v.revenue,
      clicks: v.clicks,
      conversions: v.conversions,
      epc: divide(v.revenue, v.clicks),
      cvr:
        divide(v.conversions, v.clicks) !== null
          ? divide(v.conversions, v.clicks)! * 100
          : null,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: "date must be yyyy-MM-dd" },
      { status: 400 }
    );
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from("glitchy_stats")
    .select("source, offer_id, offer_name, payout, clicks, conversions")
    .eq("date", date);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bySource: Record<string, Bucket & { label: string }> = {};
  const byOffer: Record<string, Bucket & { label: string }> = {};

  for (const row of data ?? []) {
    const revenue = Number(row.payout) || 0;
    const clicks = Number(row.clicks) || 0;
    const conversions = Number(row.conversions) || 0;

    const source = (row.source as string) || "unknown";
    // "ALL" is Glitchy's rollup row, not a real traffic source.
    if (source !== "ALL") {
      if (!bySource[source]) {
        bySource[source] = { label: source, revenue: 0, clicks: 0, conversions: 0 };
      }
      bySource[source].revenue += revenue;
      bySource[source].clicks += clicks;
      bySource[source].conversions += conversions;
    }

    const offerKey = String(row.offer_id);
    if (!byOffer[offerKey]) {
      byOffer[offerKey] = {
        label: (row.offer_name as string) || `#${offerKey}`,
        revenue: 0,
        clicks: 0,
        conversions: 0,
      };
    }
    byOffer[offerKey].revenue += revenue;
    byOffer[offerKey].clicks += clicks;
    byOffer[offerKey].conversions += conversions;
  }

  const sources = toRows(bySource);
  const offers = toRows(byOffer);

  const totalRevenue = sources.reduce((s, r) => s + r.revenue, 0);
  const totalClicks = sources.reduce((s, r) => s + r.clicks, 0);
  const totalConversions = sources.reduce((s, r) => s + r.conversions, 0);

  return NextResponse.json({
    date,
    totalRevenue,
    totalClicks,
    totalConversions,
    epc: divide(totalRevenue, totalClicks),
    cvr:
      divide(totalConversions, totalClicks) !== null
        ? divide(totalConversions, totalClicks)! * 100
        : null,
    sources,
    offers,
  } satisfies DayBreakdown);
}
