import { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase/server";

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

function toCasablancaHour(date: string, hour: string): string {
  const utc = new Date(`${date}T${hour.padStart(2, "0")}:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Casablanca",
    hour: "numeric",
    hour12: false,
  }).formatToParts(utc);
  const h = parts.find((p) => p.type === "hour")?.value ?? hour;
  return h.padStart(2, "0");
}


function emptyResponse(error?: string): GlitchySyncResponse {
  return {
    campaigns: [],
    offers: [],
    timeline: [],
    timelineByCampaign: {},
    totalRevenue: 0,
    totalConversions: 0,
    totalClicks: 0,
    ...(error ? { error } : {}),
  };
}

function aggregateStats(
  stats: GlitchyStat[],
  isHourly: boolean
): GlitchySyncResponse {
  // Defensive: an unexpected upstream shape should degrade to an empty
  // window, never throw and take the whole range down.
  if (!Array.isArray(stats)) return emptyResponse();
  const byCampaign: Record<string, { revenue: number; conversions: number; clicks: number }> = {};
  for (const s of stats) {
    const key = s.Stat.source;
    if (!byCampaign[key]) byCampaign[key] = { revenue: 0, conversions: 0, clicks: 0 };
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

  const byOffer: Record<string, { name: string; revenue: number; conversions: number; clicks: number }> = {};
  for (const s of stats) {
    const key = String(s.Stat.offer_id);
    if (!byOffer[key]) byOffer[key] = { name: s.Offer.name, revenue: 0, conversions: 0, clicks: 0 };
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

    if (!timeObj[key]) timeObj[key] = { revenue: 0, clicks: 0 };
    timeObj[key].revenue += s.Stat.payout;
    timeObj[key].clicks += s.Stat.clicks;

    const source = s.Stat.source;
    if (!campaignTimeObj[source]) campaignTimeObj[source] = {};
    if (!campaignTimeObj[source][key]) campaignTimeObj[source][key] = { revenue: 0, clicks: 0 };
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

  return {
    campaigns,
    offers,
    timeline,
    timelineByCampaign,
    totalRevenue,
    totalConversions,
    totalClicks,
  };
}

// --- Supabase row → GlitchyStat converter ---
type SupabaseRow = {
  date: string;
  hour: string;
  source: string;
  offer_id: number;
  offer_name: string;
  payout: number;
  conversions: number;
  clicks: number;
};

function rowsToStats(rows: SupabaseRow[]): GlitchyStat[] {
  return rows.map((r) => ({
    Stat: {
      offer_id: r.offer_id,
      date: r.date,
      payout: Number(r.payout),
      conversions: r.conversions,
      clicks: r.clicks,
      source: r.source,
      hour: r.hour,
    },
    Offer: { name: r.offer_name },
  }));
}

// --- Fetch from Supabase for historical ranges ---
async function fetchFromSupabase(
  range: string,
  from?: string | null,
  to?: string | null
): Promise<GlitchyStat[] | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  let query = supabase.from("glitchy_stats").select("*");

  switch (range) {
    case "today":
      query = query.eq("date", new Date().toISOString().slice(0, 10));
      break;
    case "yesterday":
      query = query.eq("date", new Date(Date.now() - 86400000).toISOString().slice(0, 10));
      break;
    case "7d":
      query = query.gte("date", new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
      break;
    case "30d":
      query = query.gte("date", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
      break;
    case "all":
      break;
    case "custom":
      if (from) query = query.gte("date", from);
      if (to) query = query.lte("date", to);
      break;
    default:
      return null;
  }

  const { data, error } = await query.order("date").order("hour");

  if (error || !data) return null;
  return rowsToStats(data as SupabaseRow[]);
}

// --- Live fetch from Glitchy API ---
let lastGlitchyError: string | null = null;

/**
 * A stats row carries its metrics under `Stat`. Checking for that is what
 * separates the real collection from the other arrays Glitchy sends
 * alongside it — picking one of those yields rows whose fields are all
 * undefined, which renders as a table of dashes rather than an error.
 */
function isStatsArray(value: unknown): value is GlitchyStat[] {
  if (!Array.isArray(value)) return false;
  if (value.length === 0) return true;
  const first = value[0];
  return (
    !!first &&
    typeof first === "object" &&
    typeof (first as Record<string, unknown>).Stat === "object"
  );
}

/**
 * Pulls the stats array out of a Glitchy response.
 *
 * `data` is usually the array itself, but for some ranges it arrives as an
 * object wrapping several arrays. Returning the wrong one produces silently
 * wrong figures, so every candidate is shape-checked and anything we cannot
 * positively identify is reported as a failure.
 */
function extractStats(json: unknown): GlitchyStat[] | null {
  if (isStatsArray(json)) return json;
  if (!json || typeof json !== "object") return null;

  const root = json as Record<string, unknown>;
  const data = root.data ?? root.Data;

  if (isStatsArray(data)) return data;

  // Wrapped: search one level down, taking only a shape-matching array.
  for (const container of [data, root]) {
    if (!container || typeof container !== "object" || Array.isArray(container)) {
      continue;
    }
    for (const value of Object.values(container as Record<string, unknown>)) {
      if (isStatsArray(value)) return value;
    }
  }

  // `data` absent entirely is an empty window, not a malformed response.
  if (data === undefined || data === null) return [];

  return null;
}

async function fetchFromGlitchy(
  rangeTypeValue: string,
  token: string
): Promise<GlitchyStat[] | null> {
  const url = `${GLITCHY_BASE}?rangeTypeValue=${rangeTypeValue}&groupBySource=true`;

  // Without a deadline a hung upstream would hold the request until the
  // platform's own timeout, which surfaces as a dead page rather than an error.
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), 12_000);

  try {
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
      signal: controller.signal,
    });

    if (!res.ok) {
      lastGlitchyError =
        res.status === 401 || res.status === 403
          ? `Glitchy ${res.status} — token expired or rejected`
          : `Glitchy ${res.status}`;
      return null;
    }

    const stats = extractStats(await res.json());
    if (!stats) {
      lastGlitchyError = "Glitchy returned an unexpected response shape";
      return null;
    }

    lastGlitchyError = null;
    return stats;
  } catch (err) {
    lastGlitchyError =
      err instanceof Error && err.name === "AbortError"
        ? "Glitchy timed out"
        : "Glitchy unreachable";
    return null;
  } finally {
    clearTimeout(deadline);
  }
}

/**
 * Only Today is read live. Yesterday is served from the archive instead:
 * Glitchy's payload for that range has proven inconsistent to parse, while
 * the archived copy is written from the backfill path and is known good.
 * Its completeness is handled by the daily catch-up below rather than by
 * reading it live.
 */
const LIVE_RANGES = new Set(["today"]);

/**
 * Guards the once-a-day catch-up below. Serverless instances are ephemeral so
 * this is a best-effort throttle, not a lock — a duplicate run is harmless
 * because every write is an idempotent upsert.
 */
let lastCatchUpDate: string | null = null;

/**
 * Re-saves the last 7 days in the background.
 *
 * The archive is only written when someone opens the dashboard, so a day
 * nobody visited would otherwise be missing from history permanently. Glitchy
 * keeps a week available, so one weekly pull per day closes any such gap.
 */
async function catchUpWeek(token: string, today: string) {
  if (lastCatchUpDate === today) return;
  lastCatchUpDate = today;

  try {
    // Yesterday is pulled in its own right, not just as part of the week: it
    // is the range the dashboard serves from the archive, so it has to be
    // complete even if the wider weekly pull comes back unparseable.
    for (const range of ["Yesterday", "1W"]) {
      const stats = await fetchFromGlitchy(range, token);
      if (stats && stats.length > 0) await autoSave(stats);
    }
  } catch {
    // Best-effort: a failed catch-up retries on the next day's first visit.
    lastCatchUpDate = null;
  }
}

async function autoSave(stats: GlitchyStat[]) {
  try {
    const supabase = getSupabase();
    if (!supabase || stats.length === 0) return;

    // A row missing its date or offer cannot satisfy the table's uniqueness
    // constraint, and one bad row must not sink the whole batch.
    const rows = stats
      .filter((s) => s?.Stat?.date && s.Stat.offer_id != null)
      .map((s) => ({
        date: s.Stat.date,
        hour: s.Stat.hour ?? "0",
        source: s.Stat.source || "unknown",
        offer_id: s.Stat.offer_id,
        offer_name: s.Offer?.name ?? `#${s.Stat.offer_id}`,
        payout: Number(s.Stat.payout) || 0,
        conversions: Number(s.Stat.conversions) || 0,
        clicks: Number(s.Stat.clicks) || 0,
      }));

    if (rows.length === 0) return;

    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      await supabase
        .from("glitchy_stats")
        .upsert(rows.slice(i, i + BATCH), { onConflict: "date,hour,source,offer_id" });
    }
  } catch {
    // auto-save is best-effort, never block the response
  }
}

export async function GET(req: NextRequest) {
  const range = req.nextUrl.searchParams.get("range") || "today";
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const rangeTypeValue = RANGE_MAP[range] ?? "Today";

  const token = process.env.GLITCHY_TOKEN;
  if (!token) {
    return Response.json(emptyResponse("GLITCHY_TOKEN not configured"));
  }

  // Runs at most once a day, detached, whichever range was requested — the
  // archive has to be current even when the dashboard opens straight onto a
  // range that reads from it.
  void catchUpWeek(token, new Date().toISOString().slice(0, 10));

  try {
    let stats: GlitchyStat[] | null = null;

    if (LIVE_RANGES.has(range)) {
      stats = await fetchFromGlitchy(rangeTypeValue, token);

      if (stats) {
        void autoSave(stats);
      } else {
        // Glitchy failed or rate-limited. Show the archived copy rather than
        // an empty page — stale figures beat no figures.
        stats = await fetchFromSupabase(range, from, to);
        if (!stats || stats.length === 0) {
          return Response.json(
            emptyResponse(lastGlitchyError ?? "Glitchy API error")
          );
        }
      }
    } else {
      stats = await fetchFromSupabase(range, from, to);

      // An empty archive is not the same as a zero day: history only reaches
      // back to when saving began. Ask Glitchy before reporting nothing, so a
      // gap in our own records doesn't read as "you earned nothing".
      if (!stats || stats.length === 0) {
        const live = await fetchFromGlitchy(rangeTypeValue, token);
        if (live && live.length > 0) {
          stats = live;
          void autoSave(live);
        } else if (!stats) {
          return Response.json(
            emptyResponse(lastGlitchyError ?? "Data unavailable")
          );
        }
      }
    }

    const isHourly = range === "today" || range === "yesterday";
    return Response.json(aggregateStats(stats, isHourly) satisfies GlitchySyncResponse);
  } catch (err) {
    return Response.json(
      emptyResponse(err instanceof Error ? err.message : "Unknown error")
    );
  }
}
