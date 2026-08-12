import { NextRequest } from "next/server";
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

export async function POST(req: NextRequest) {
  const { rangeTypeValue } = (await req.json()) as {
    rangeTypeValue?: string;
  };

  if (!rangeTypeValue) {
    return Response.json({ error: "rangeTypeValue required" }, { status: 400 });
  }

  const token = process.env.GLITCHY_TOKEN;
  if (!token) {
    return Response.json({ error: "GLITCHY_TOKEN not configured" }, { status: 500 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return Response.json({ error: "Supabase not configured" }, { status: 500 });
  }

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

  if (!res.ok) {
    return Response.json(
      { error: `Glitchy API ${res.status}: ${res.statusText}` },
      { status: 502 }
    );
  }

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

  if (rows.length === 0) {
    return Response.json({ saved: 0 });
  }

  const BATCH = 500;
  let saved = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error } = await supabase
      .from("glitchy_stats")
      .upsert(batch, { onConflict: "date,hour,source,offer_id" });

    if (error) {
      return Response.json({ error: error.message, saved }, { status: 500 });
    }
    saved += batch.length;
  }

  return Response.json({ saved });
}
