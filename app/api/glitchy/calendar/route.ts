import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export type CalendarDay = {
  date: string;
  revenue: number;
  clicks: number;
  conversions: number;
};

export type CalendarMonth = {
  month: string;
  days: CalendarDay[];
  totalRevenue: number;
  totalClicks: number;
  totalConversions: number;
  error?: string;
};

export async function GET(req: NextRequest) {
  const month = req.nextUrl.searchParams.get("month") ?? "";

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json(
      { error: "month must be yyyy-MM" },
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

  const start = `${month}-01`;
  // Supabase filter is inclusive; the first of the next month is exclusive.
  const [y, m] = month.split("-").map(Number);
  const next =
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;

  const { data, error } = await supabase
    .from("glitchy_stats")
    .select("date, payout, clicks, conversions")
    .gte("date", start)
    .lt("date", next);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byDate: Record<
    string,
    { revenue: number; clicks: number; conversions: number }
  > = {};

  for (const row of data ?? []) {
    const d = row.date as string;
    if (!byDate[d]) byDate[d] = { revenue: 0, clicks: 0, conversions: 0 };
    byDate[d].revenue += Number(row.payout) || 0;
    byDate[d].clicks += Number(row.clicks) || 0;
    byDate[d].conversions += Number(row.conversions) || 0;
  }

  const days: CalendarDay[] = Object.entries(byDate)
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalRevenue = days.reduce((s, d) => s + d.revenue, 0);
  const totalClicks = days.reduce((s, d) => s + d.clicks, 0);
  const totalConversions = days.reduce((s, d) => s + d.conversions, 0);

  return NextResponse.json({
    month,
    days,
    totalRevenue,
    totalClicks,
    totalConversions,
  } satisfies CalendarMonth);
}
