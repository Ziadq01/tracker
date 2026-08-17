import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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
  Offer: { name: string };
};

async function fetchRange(range: string, token: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch(
      `https://api.glitchy.com/v3/stats?rangeTypeValue=${range}&groupBySource=true`,
      {
        headers: {
          Cookie: `glitchy_token=${token}`,
          Accept: "application/json",
          Origin: "https://app.glitchy.com",
          Referer: "https://app.glitchy.com/",
          "x-app-platform": "web",
          "x-app-version": "3.0.1",
        },
        signal: controller.signal,
      }
    );

    if (!res.ok) return { error: `${res.status}`, stats: [] };

    const json = await res.json();
    let arr = json.data ?? json.Data ?? json;
    if (arr && typeof arr === "object" && !Array.isArray(arr)) {
      for (const key of Object.keys(arr)) {
        if (Array.isArray(arr[key])) { arr = arr[key]; break; }
      }
    }
    if (!Array.isArray(arr)) return { error: "not array", stats: [] };
    return { error: null, stats: arr as GlitchyStat[] };
  } catch (e) {
    return { error: String(e), stats: [] };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);

  // Only enforced once CRON_SECRET is configured, so existing manual URLs
  // keep working until the secret is deliberately turned on.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided =
      url.searchParams.get("secret") ??
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (provided !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const token = process.env.GLITCHY_TOKEN;
  if (!token) return NextResponse.json({ error: "GLITCHY_TOKEN not set" }, { status: 500 });

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });

  const range = url.searchParams.get("range") || "Yesterday";

  const { error, stats } = await fetchRange(range, token);
  if (error) return NextResponse.json({ error, range }, { status: 502 });

  const rows = stats.map((s) => ({
    date: s.Stat.date,
    hour: s.Stat.hour,
    source: s.Stat.source || "unknown",
    offer_id: s.Stat.offer_id,
    offer_name: s.Offer.name,
    payout: s.Stat.payout,
    conversions: s.Stat.conversions,
    clicks: s.Stat.clicks,
  }));

  if (rows.length === 0) return NextResponse.json({ saved: 0, range });

  const BATCH = 500;
  let saved = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const { error: dbErr } = await supabase
      .from("glitchy_stats")
      .upsert(batch, { onConflict: "date,hour,source,offer_id" });
    if (dbErr) return NextResponse.json({ error: dbErr.message, saved }, { status: 500 });
    saved += batch.length;
  }

  return NextResponse.json({ saved, range });
}
