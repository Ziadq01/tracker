export const dynamic = "force-dynamic";

export type ConversionPulse = {
  configured: boolean;
  total: number;
  latest: {
    campaign: string;
    offer: string | null;
    revenue: number;
    conversions: number;
  } | null;
  error?: string;
};

type GlitchyStat = {
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

export async function GET() {
  const token = process.env.GLITCHY_TOKEN;

  if (!token) {
    return Response.json({
      configured: false,
      total: 0,
      latest: null,
    } satisfies ConversionPulse);
  }

  try {
    const res = await fetch(
      "https://api.glitchy.com/v3/stats?rangeTypeValue=Today&groupBySource=true",
      {
        headers: { cookie: `glitchy_token=${token}` },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return Response.json({
        configured: true,
        total: 0,
        latest: null,
        error: `Glitchy API ${res.status}`,
      } satisfies ConversionPulse);
    }

    const json = (await res.json()) as { data: GlitchyStat[] };
    const stats = json.data ?? [];

    const total = stats.reduce((s, r) => s + r.Stat.conversions, 0);

    // Find the latest entry by date+hour
    let latest: ConversionPulse["latest"] = null;
    if (stats.length > 0) {
      const sorted = [...stats].sort((a, b) => {
        const aKey = `${a.Stat.date} ${a.Stat.hour}`;
        const bKey = `${b.Stat.date} ${b.Stat.hour}`;
        return bKey.localeCompare(aKey);
      });
      const newest = sorted[0];
      latest = {
        campaign: newest.Stat.source,
        offer: newest.Offer.name,
        revenue: newest.Stat.payout,
        conversions: newest.Stat.conversions,
      };
    }

    return Response.json({
      configured: true,
      total,
      latest,
    } satisfies ConversionPulse);
  } catch (err) {
    return Response.json({
      configured: true,
      total: 0,
      latest: null,
      error: err instanceof Error ? err.message : "Unknown error",
    } satisfies ConversionPulse);
  }
}
