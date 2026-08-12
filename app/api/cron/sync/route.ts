import { getSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const GLITCHY_BASE = "https://api.glitchy.com/v3/stats";

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

async function fetchAndUpsert(
  rangeTypeValue: string,
  token: string,
  supabase: NonNullable<ReturnType<typeof getSupabase>>
): Promise<number> {
  const url = `${GLITCHY_BASE}?rangeTypeValue=${rangeTypeValue}&groupBySource=true`;
  const res = await fetch(url, {
    headers: {
      Cookie: `glitchy_token=${token}`,
      Accept: "application/json",
      Origin: "https://app.glitchy.com",
      Referer: "https://app.glitchy.com/",
      "x-app-platform": "web",
      "x-app-version": "3.0.1",
    },
    cache: "no-store",
  });

  if (!res.ok) return 0;

  const json = (await res.json()) as { data: GlitchyStat[] };
  const stats = json.data ?? [];

  const rows = stats.map((s) => ({
    date: s.Stat.date,
    hour: s.Stat.hour,
    source: s.Stat.source,
    offer_id: s.Stat.offer_id,
    offer_name: s.Offer.name,
    payout: s.Stat.payout,
    conversions: s.Stat.conversions,
    clicks: s.Stat.clicks,
  }));

  if (rows.length === 0) return 0;

  const BATCH = 500;
  let saved = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("glitchy_stats")
      .upsert(batch, { onConflict: "date,hour,source,offer_id" });
    if (!error) saved += batch.length;
  }

  return saved;
}

export async function GET(req: Request) {
  const cronSecret = req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;

  const isVercelCron = req.headers.get("authorization") === `Bearer ${expected}`;

  if (!isVercelCron && cronSecret !== expected) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.GLITCHY_TOKEN;
  if (!token) {
    return Response.json({ error: "GLITCHY_TOKEN not configured" }, { status: 500 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const [todayCount, yesterdayCount] = await Promise.all([
    fetchAndUpsert("Today", token, supabase),
    fetchAndUpsert("Yesterday", token, supabase),
  ]);

  return Response.json({
    synced: { today: todayCount, yesterday: yesterdayCount },
    timestamp: new Date().toISOString(),
  });
}
