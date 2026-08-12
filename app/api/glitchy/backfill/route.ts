import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  try {
    const response = await fetch(
      "https://api.glitchy.com/v3/stats?rangeTypeValue=AllTime&groupBySource=true",
      {
        headers: {
          Cookie: `glitchy_token=${process.env.GLITCHY_TOKEN}`,
          Accept: "application/json",
          Origin: "https://app.glitchy.com",
          Referer: "https://app.glitchy.com/",
          "x-app-platform": "web",
          "x-app-version": "3.0.1",
        },
      }
    );

    const json = await response.json();
    const supabase = getSupabase();

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    let saved = 0;

    for (const item of json.data) {
      const { Stat, Offer } = item;
      await supabase.from("glitchy_stats").upsert(
        {
          date: Stat.date,
          hour: Stat.hour,
          source: Stat.source || "unknown",
          offer_id: Stat.offer_id,
          offer_name: Offer.name,
          payout: Stat.payout,
          conversions: Stat.conversions,
          clicks: Stat.clicks,
        },
        { onConflict: "date,hour,source,offer_id" }
      );
      saved++;
    }

    return NextResponse.json({ saved });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
