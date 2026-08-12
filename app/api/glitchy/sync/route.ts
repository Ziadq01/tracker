import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const GLITCHY_BASE = "https://api.glitchy.com/v3/stats";

const RANGE_MAP: Record<string, string> = {
  hour: "Today",
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
    let stats = json.data ?? [];

    function toCasablancaHour(date: string, hour: string): string {
      const utc = new Date(`${date}T${hour.padStart(2, "0")}:00:00Z`);
      return utc.toLocaleString("en-US", {
        timeZone: "Africa/Casablanca",
        hour: "2-digit",
        hour12: false,
      });
    }

    if (range === "hour") {
      const currentHour = new Date().toLocaleString("en-US", {
        timeZone: "Africa/Casablanca",
        hour: "2-digit",
        hour12: false,
      });
      stats = stats.filter(
        (s) => toCasablancaHour(s.Stat.date, s.Stat.hour) === currentHour
      );
    }

    // --- Aggregate by source (campaign) ---
    const byCampaign: Record<string, { revenue: number; conversions: number; clicks: number }> = {};
    for (const s of stats) {
      const key = s.Stat.source;
      if (!byCampaign[key]) {
        byCampaign[key] = { revenue: 0, conversions: 0, clicks: 0 };
      }
      byCampaign[key].revenue += s.Stat.payout;
      byCampaign[key].conversions += s.Stat.conversions;
      byCampaign[key].clicks += s.Stat.clicks;
    }

    const campaigns: GlitchyCampaign[] = Object.entries(byCampaign)
      .filter(([source]) => source !== "" && source !== "ALL")
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
    const byOffer: Record<string, { name: string; revenue: number; conversions: number; clicks: number }> = {};
    for (const s of stats) {
      const key = String(s.Stat.offer_id);
      if (!byOffer[key]) {
        byOffer[key] = { name: s.Offer.name, revenue: 0, conversions: 0, clicks: 0 };
      }
      byOffer[key].revenue += s.Stat.payout;
      byOffer[key].conversions += s.Stat.conversions;
      byOffer[key].clicks += s.Stat.clicks;
    }

    const offers: GlitchyOffer[] = Object.entries(byOffer)
      .map(([offerId, v]) => ({
        offerId: Number(offerId),
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
    const isHourly = rangeTypeValue === "Today" || rangeTypeValue === "Yesterday";

    const timeObj: Record<string, { revenue: number; clicks: number }> = {};
    const campaignTimeObj: Record<string, Record<string, { revenue: number; clicks: number }>> = {};

    for (const s of stats) {
      let key: string;
      if (isHourly) {
        const h = toCasablancaHour(s.Stat.date, s.Stat.hour);
        key = `${h}:00`;
      } else {
        const utc = new Date(`${s.Stat.date}T12:00:00Z`);
        const mon = utc.toLocaleString("en-US", { month: "short", timeZone: "Africa/Casablanca" });
        const day = parseInt(utc.toLocaleString("en-US", { day: "numeric", timeZone: "Africa/Casablanca" }), 10);
        key = `${mon} ${day}`;
      }

      if (!timeObj[key]) {
        timeObj[key] = { revenue: 0, clicks: 0 };
      }
      timeObj[key].revenue += s.Stat.payout;
      timeObj[key].clicks += s.Stat.clicks;

      const source = s.Stat.source;
      if (!campaignTimeObj[source]) {
        campaignTimeObj[source] = {};
      }
      if (!campaignTimeObj[source][key]) {
        campaignTimeObj[source][key] = { revenue: 0, clicks: 0 };
      }
      campaignTimeObj[source][key].revenue += s.Stat.payout;
      campaignTimeObj[source][key].clicks += s.Stat.clicks;
    }

    const sortedKeys = Object.keys(timeObj).sort();
    const timeline: GlitchyTimePoint[] = sortedKeys.map((key) => ({
      label: key,
      revenue: timeObj[key].revenue,
      clicks: timeObj[key].clicks,
    }));

    const timelineByCampaign: Record<string, GlitchyTimePoint[]> = {};
    for (const source of Object.keys(campaignTimeObj)) {
      const cObj = campaignTimeObj[source];
      timelineByCampaign[source] = sortedKeys
        .map((key) => ({
          label: key,
          revenue: cObj[key]?.revenue ?? 0,
          clicks: cObj[key]?.clicks ?? 0,
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
