import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const GLITCHY_BASE = "https://api.glitchy.com/v3/stats";

const RANGE_MAP: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "1W",
  "30d": "1M",
  all: "AllTime",
};

export type GlitchyStat = {
  Stat: {
    offer_id: number;
    date: string;
    payout: number;
    conversions: number;
    clicks: number;
    source: string;
    hour: string;
  };
  Offer: {
    name: string;
  };
};

export type GlitchyCampaign = {
  source: string;
  revenue: number;
  conversions: number;
  clicks: number;
  epc: number | null;
  cvr: number | null;
};

export type GlitchyOffer = {
  offerId: number;
  name: string;
  revenue: number;
  conversions: number;
  clicks: number;
  epc: number | null;
  cvr: number | null;
};

export type GlitchyTimePoint = {
  label: string;
  revenue: number;
  clicks: number;
};

export type GlitchySyncResponse = {
  campaigns: GlitchyCampaign[];
  offers: GlitchyOffer[];
  timeline: GlitchyTimePoint[];
  timelineByCampaign: Record<string, GlitchyTimePoint[]>;
  totalRevenue: number;
  totalConversions: number;
  totalClicks: number;
  error?: string;
};

function safeDivide(a: number, b: number): number | null {
  return b > 0 ? a / b : null;
}

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") || "today";
  const rangeTypeValue = RANGE_MAP[range] ?? "Today";

  const token = process.env.GLITCHY_TOKEN;
  if (!token) {
    return Response.json({
      campaigns: [],
      offers: [],
      timeline: [],
      timelineByCampaign: {},
      totalRevenue: 0,
      totalConversions: 0,
      totalClicks: 0,
      error: "GLITCHY_TOKEN not configured",
    } satisfies GlitchySyncResponse);
  }

  try {
    const url = `${GLITCHY_BASE}?rangeTypeValue=${rangeTypeValue}&groupBySource=true`;
    const res = await fetch(url, {
      headers: { cookie: `glitchy_token=${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return Response.json({
        campaigns: [],
        offers: [],
        timeline: [],
        timelineByCampaign: {},
        totalRevenue: 0,
        totalConversions: 0,
        totalClicks: 0,
        error: `Glitchy API ${res.status}: ${res.statusText}`,
      } satisfies GlitchySyncResponse);
    }

    const json = (await res.json()) as { data: GlitchyStat[] };
    const stats = json.data ?? [];

    // --- Aggregate by source (campaign) ---
    const byCampaign = new Map<
      string,
      { revenue: number; conversions: number; clicks: number }
    >();
    for (const s of stats) {
      const key = s.Stat.source;
      const entry = byCampaign.get(key) ?? {
        revenue: 0,
        conversions: 0,
        clicks: 0,
      };
      entry.revenue += s.Stat.payout;
      entry.conversions += s.Stat.conversions;
      entry.clicks += s.Stat.clicks;
      byCampaign.set(key, entry);
    }

    const campaigns: GlitchyCampaign[] = Array.from(byCampaign.entries())
      .map(([source, v]) => ({
        source,
        revenue: v.revenue,
        conversions: v.conversions,
        clicks: v.clicks,
        epc: safeDivide(v.revenue, v.clicks),
        cvr: safeDivide(v.conversions, v.clicks) !== null
          ? safeDivide(v.conversions, v.clicks)! * 100
          : null,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // --- Aggregate by offer ---
    const byOffer = new Map<
      number,
      { name: string; revenue: number; conversions: number; clicks: number }
    >();
    for (const s of stats) {
      const key = s.Stat.offer_id;
      const entry = byOffer.get(key) ?? {
        name: s.Offer.name,
        revenue: 0,
        conversions: 0,
        clicks: 0,
      };
      entry.revenue += s.Stat.payout;
      entry.conversions += s.Stat.conversions;
      entry.clicks += s.Stat.clicks;
      byOffer.set(key, entry);
    }

    const offers: GlitchyOffer[] = Array.from(byOffer.entries())
      .map(([offerId, v]) => ({
        offerId,
        name: v.name,
        revenue: v.revenue,
        conversions: v.conversions,
        clicks: v.clicks,
        epc: safeDivide(v.revenue, v.clicks),
        cvr: safeDivide(v.conversions, v.clicks) !== null
          ? safeDivide(v.conversions, v.clicks)! * 100
          : null,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    // --- Timeline (date+hour) ---
    const timeMap = new Map<string, { revenue: number; clicks: number }>();
    const campaignTimeMap = new Map<
      string,
      Map<string, { revenue: number; clicks: number }>
    >();

    for (const s of stats) {
      const key = `${s.Stat.date} ${s.Stat.hour}:00`;
      const entry = timeMap.get(key) ?? { revenue: 0, clicks: 0 };
      entry.revenue += s.Stat.payout;
      entry.clicks += s.Stat.clicks;
      timeMap.set(key, entry);

      // Per-campaign timeline
      const source = s.Stat.source;
      if (!campaignTimeMap.has(source)) {
        campaignTimeMap.set(source, new Map());
      }
      const cMap = campaignTimeMap.get(source)!;
      const cEntry = cMap.get(key) ?? { revenue: 0, clicks: 0 };
      cEntry.revenue += s.Stat.payout;
      cEntry.clicks += s.Stat.clicks;
      cMap.set(key, cEntry);
    }

    const sortedKeys = Array.from(timeMap.keys()).sort();
    const timeline: GlitchyTimePoint[] = sortedKeys.map((key) => ({
      label: key,
      ...timeMap.get(key)!,
    }));

    const timelineByCampaign: Record<string, GlitchyTimePoint[]> = {};
    for (const [source, cMap] of campaignTimeMap) {
      timelineByCampaign[source] = sortedKeys
        .map((key) => ({
          label: key,
          revenue: cMap.get(key)?.revenue ?? 0,
          clicks: cMap.get(key)?.clicks ?? 0,
        }))
        .filter((p) => p.revenue > 0 || p.clicks > 0);
    }

    const totalRevenue = stats.reduce((s, r) => s + r.Stat.payout, 0);
    const totalConversions = stats.reduce((s, r) => s + r.Stat.conversions, 0);
    const totalClicks = stats.reduce((s, r) => s + r.Stat.clicks, 0);

    return Response.json({
      campaigns,
      offers,
      timeline,
      timelineByCampaign,
      totalRevenue,
      totalConversions,
      totalClicks,
    } satisfies GlitchySyncResponse);
  } catch (err) {
    return Response.json({
      campaigns: [],
      offers: [],
      timeline: [],
      timelineByCampaign: {},
      totalRevenue: 0,
      totalConversions: 0,
      totalClicks: 0,
      error: err instanceof Error ? err.message : "Unknown error",
    } satisfies GlitchySyncResponse);
  }
}
