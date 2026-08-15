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

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({ error: `Glitchy ${response.status}`, body: text.slice(0, 500) }, { status: 502 });
    }

    const json = await response.json();

    // Debug: show raw shape so we can understand the response
    const topKeys = Object.keys(json).slice(0, 10);
    const dataVal = json.data ?? json.Data;
    const dataType = Array.isArray(dataVal) ? "array" : typeof dataVal;
    const dataKeys = dataVal && typeof dataVal === "object" && !Array.isArray(dataVal)
      ? Object.keys(dataVal).slice(0, 10)
      : null;

    // Try to find the stats array
    let stats: any[] | null = null;
    if (Array.isArray(dataVal)) {
      stats = dataVal;
    } else if (dataVal && typeof dataVal === "object") {
      // Maybe nested: data.stats, data.rows, etc.
      for (const key of Object.keys(dataVal)) {
        if (Array.isArray(dataVal[key])) {
          stats = dataVal[key];
          break;
        }
      }
    }

    if (!stats) {
      return NextResponse.json({
        error: "Cannot find stats array",
        topKeys,
        dataType,
        dataKeys,
        sample: JSON.stringify(dataVal).slice(0, 500),
      }, { status: 502 });
    }

    const supabase = getSupabase();

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
    }

    let saved = 0;

    for (const item of stats) {
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
