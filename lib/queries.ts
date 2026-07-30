import "server-only";

import { getSupabase } from "@/lib/supabase/server";
import type { ResolvedRange, Period } from "@/lib/date-ranges";
import {
  calculateMetrics,
  deriveMetrics,
  sumRuns,
  type Metrics,
  type MetricTotals,
} from "@/lib/metrics";
import type { BcAccount, Creative, Offer, OfferStat } from "@/lib/types";

const PAGE_SIZE = 1000;

export type RunRow = {
  id: string;
  creative_id: string | null;
  run_date: string;
  ad_spend: number | string | null;
  revenue: number | string | null;
  tiktok_clicks: number | string | null;
  network_clicks: number | string | null;
  status: string | null;
  created_at: string | null;
  creative: {
    id: string;
    name: string;
    status: string | null;
    offer: { id: string; name: string; glitchy_offer_id: string } | null;
    bc_account: { id: string; name: string; type: string | null } | null;
  } | null;
};

const RUN_SELECT = `
  id, creative_id, run_date, ad_spend, revenue, tiktok_clicks,
  network_clicks, status, created_at,
  creative:creatives (
    id, name, status,
    offer:offers ( id, name, glitchy_offer_id ),
    bc_account:bc_accounts ( id, name, type )
  )
`;

export type QueryResult<T> = { data: T; error: string | null };

/* -------------------------------------------------------------------------- */
/*  Runs                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Fetch every run touching the combined current + previous window.
 *
 * PostgREST caps a single response (1000 rows by default), so this pages until
 * exhausted — a 30-day range across a healthy account blows past that easily,
 * and a silently truncated result set would quietly understate spend.
 */
async function fetchRunsInWindow(
  range: ResolvedRange
): Promise<QueryResult<RunRow[]>> {
  const supabase = getSupabase();
  if (!supabase) return { data: [], error: null };

  const rows: RunRow[] = [];

  for (let page = 0; ; page += 1) {
    let query = supabase
      .from("runs")
      .select(RUN_SELECT)
      .order("run_date", { ascending: true })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (range.intraday) {
      query = query
        .gte("created_at", range.previous.startAt.toISOString())
        .lt("created_at", range.current.endAt.toISOString());
    } else {
      query = query
        .gte("run_date", range.previous.startDate)
        .lte("run_date", range.current.endDate);
    }

    const { data, error } = await query;
    if (error) return { data: rows, error: error.message };

    const batch = (data ?? []) as unknown as RunRow[];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) break;
    if (page > 200) break; // hard stop; something is very wrong upstream
  }

  return { data: rows, error: null };
}

/** Does a run belong to this period, under the range's filtering rule? */
export function runInPeriod(
  run: RunRow,
  period: Period,
  intraday: boolean
): boolean {
  if (intraday) {
    if (!run.created_at) return false;
    const at = new Date(run.created_at);
    if (Number.isNaN(at.getTime())) return false;
    return at >= period.startAt && at < period.endAt;
  }
  return run.run_date >= period.startDate && run.run_date <= period.endDate;
}

/* -------------------------------------------------------------------------- */
/*  War Room                                                                  */
/* -------------------------------------------------------------------------- */

export type TopCreative = {
  id: string;
  name: string;
  status: string | null;
  offerName: string | null;
  bcAccountName: string | null;
  metrics: Metrics;
};

export type WarRoomData = {
  current: Metrics;
  previous: Metrics;
  currentRuns: RunRow[];
  previousRuns: RunRow[];
  topCreatives: TopCreative[];
  runCount: number;
  error: string | null;
};

export async function getWarRoomData(
  range: ResolvedRange
): Promise<WarRoomData> {
  const { data: runs, error } = await fetchRunsInWindow(range);

  const currentRuns = runs.filter((r) =>
    runInPeriod(r, range.current, range.intraday)
  );
  const previousRuns = runs.filter((r) =>
    runInPeriod(r, range.previous, range.intraday)
  );

  return {
    current: calculateMetrics(currentRuns),
    previous: calculateMetrics(previousRuns),
    currentRuns,
    previousRuns,
    topCreatives: rankCreatives(currentRuns, 5),
    runCount: currentRuns.length,
    error,
  };
}

/** Aggregate runs per creative and rank by profit. */
export function rankCreatives(runs: RunRow[], limit?: number): TopCreative[] {
  const grouped = new Map<string, { meta: RunRow["creative"]; runs: RunRow[] }>();

  for (const run of runs) {
    const id = run.creative_id ?? run.creative?.id;
    if (!id) continue;
    const entry = grouped.get(id);
    if (entry) entry.runs.push(run);
    else grouped.set(id, { meta: run.creative, runs: [run] });
  }

  const ranked = Array.from(grouped.entries())
    .map(([id, { meta, runs: creativeRuns }]) => ({
      id,
      name: meta?.name ?? "Unknown creative",
      status: meta?.status ?? null,
      offerName: meta?.offer?.name ?? null,
      bcAccountName: meta?.bc_account?.name ?? null,
      metrics: calculateMetrics(creativeRuns),
    }))
    .sort((a, b) => b.metrics.profit - a.metrics.profit);

  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
}

/* -------------------------------------------------------------------------- */
/*  Entity pages                                                              */
/* -------------------------------------------------------------------------- */

export type CreativeWithMetrics = Creative & {
  offerName: string | null;
  bcAccountName: string | null;
  metrics: Metrics;
};

export async function getCreatives(
  range: ResolvedRange
): Promise<QueryResult<CreativeWithMetrics[]>> {
  const supabase = getSupabase();
  if (!supabase) return { data: [], error: null };

  const [creativesRes, runsRes] = await Promise.all([
    supabase
      .from("creatives")
      .select(
        `id, name, offer_id, bc_account_id, status, created_at,
         offer:offers ( name ), bc_account:bc_accounts ( name )`
      )
      .order("created_at", { ascending: false }),
    fetchRunsInWindow(range),
  ]);

  if (creativesRes.error) {
    return { data: [], error: creativesRes.error.message };
  }

  const currentRuns = runsRes.data.filter((r) =>
    runInPeriod(r, range.current, range.intraday)
  );

  const byCreative = new Map<string, RunRow[]>();
  for (const run of currentRuns) {
    const id = run.creative_id;
    if (!id) continue;
    const existing = byCreative.get(id);
    if (existing) existing.push(run);
    else byCreative.set(id, [run]);
  }

  const rows = (creativesRes.data ?? []) as unknown as (Creative & {
    offer: { name: string } | null;
    bc_account: { name: string } | null;
  })[];

  return {
    data: rows.map((c) => ({
      ...c,
      offerName: c.offer?.name ?? null,
      bcAccountName: c.bc_account?.name ?? null,
      metrics: calculateMetrics(byCreative.get(c.id) ?? []),
    })),
    error: runsRes.error,
  };
}

export type OfferWithStats = Offer & {
  creativeCount: number;
  /** From offer_stats — the network's own numbers. */
  networkRevenue: number;
  networkClicks: number;
  conversions: number;
  networkEpc: number | null;
  /** From runs — what we actually spent driving this offer. */
  buyerMetrics: Metrics;
};

export async function getOffers(
  range: ResolvedRange
): Promise<QueryResult<OfferWithStats[]>> {
  const supabase = getSupabase();
  if (!supabase) return { data: [], error: null };

  const [offersRes, statsRes, creativesRes, runsRes] = await Promise.all([
    supabase
      .from("offers")
      .select("id, glitchy_offer_id, name, payout, created_at")
      .order("name", { ascending: true }),
    supabase
      .from("offer_stats")
      .select("offer_id, stat_date, revenue, clicks, conversions, epc")
      .gte("stat_date", range.current.startDate)
      .lte("stat_date", range.current.endDate),
    supabase.from("creatives").select("id, offer_id"),
    fetchRunsInWindow(range),
  ]);

  if (offersRes.error) return { data: [], error: offersRes.error.message };

  const offers = (offersRes.data ?? []) as Offer[];
  const stats = (statsRes.data ?? []) as OfferStat[];
  const creatives = (creativesRes.data ?? []) as Pick<
    Creative,
    "id" | "offer_id"
  >[];

  const creativeToOffer = new Map<string, string>();
  const creativeCounts = new Map<string, number>();
  for (const c of creatives) {
    if (!c.offer_id) continue;
    creativeToOffer.set(c.id, c.offer_id);
    creativeCounts.set(c.offer_id, (creativeCounts.get(c.offer_id) ?? 0) + 1);
  }

  const statsByOffer = new Map<string, OfferStat[]>();
  for (const s of stats) {
    if (!s.offer_id) continue;
    const existing = statsByOffer.get(s.offer_id);
    if (existing) existing.push(s);
    else statsByOffer.set(s.offer_id, [s]);
  }

  const currentRuns = runsRes.data.filter((r) =>
    runInPeriod(r, range.current, range.intraday)
  );
  const runsByOffer = new Map<string, RunRow[]>();
  for (const run of currentRuns) {
    const offerId = run.creative?.offer?.id ??
      (run.creative_id ? creativeToOffer.get(run.creative_id) : undefined);
    if (!offerId) continue;
    const existing = runsByOffer.get(offerId);
    if (existing) existing.push(run);
    else runsByOffer.set(offerId, [run]);
  }

  return {
    data: offers.map((offer) => {
      const offerStats = statsByOffer.get(offer.id) ?? [];
      const networkRevenue = offerStats.reduce(
        (sum, s) => sum + Number(s.revenue ?? 0),
        0
      );
      const networkClicks = offerStats.reduce(
        (sum, s) => sum + Number(s.clicks ?? 0),
        0
      );
      const conversions = offerStats.reduce(
        (sum, s) => sum + Number(s.conversions ?? 0),
        0
      );

      return {
        ...offer,
        creativeCount: creativeCounts.get(offer.id) ?? 0,
        networkRevenue,
        networkClicks,
        conversions,
        // Recomputed from totals — never an average of per-day EPCs.
        networkEpc: networkClicks > 0 ? networkRevenue / networkClicks : null,
        buyerMetrics: calculateMetrics(runsByOffer.get(offer.id) ?? []),
      };
    }),
    error: runsRes.error ?? statsRes.error?.message ?? null,
  };
}

export type BcAccountWithMetrics = BcAccount & {
  creativeCount: number;
  metrics: Metrics;
};

export async function getBcAccounts(
  range: ResolvedRange
): Promise<QueryResult<BcAccountWithMetrics[]>> {
  const supabase = getSupabase();
  if (!supabase) return { data: [], error: null };

  const [accountsRes, creativesRes, runsRes] = await Promise.all([
    supabase
      .from("bc_accounts")
      .select("id, name, tiktok_bc_id, type, is_active, created_at")
      .order("name", { ascending: true }),
    supabase.from("creatives").select("id, bc_account_id"),
    fetchRunsInWindow(range),
  ]);

  if (accountsRes.error) return { data: [], error: accountsRes.error.message };

  const accounts = (accountsRes.data ?? []) as BcAccount[];
  const creatives = (creativesRes.data ?? []) as Pick<
    Creative,
    "id" | "bc_account_id"
  >[];

  const creativeToBc = new Map<string, string>();
  const creativeCounts = new Map<string, number>();
  for (const c of creatives) {
    if (!c.bc_account_id) continue;
    creativeToBc.set(c.id, c.bc_account_id);
    creativeCounts.set(
      c.bc_account_id,
      (creativeCounts.get(c.bc_account_id) ?? 0) + 1
    );
  }

  const currentRuns = runsRes.data.filter((r) =>
    runInPeriod(r, range.current, range.intraday)
  );
  const runsByBc = new Map<string, RunRow[]>();
  for (const run of currentRuns) {
    const bcId =
      run.creative?.bc_account?.id ??
      (run.creative_id ? creativeToBc.get(run.creative_id) : undefined);
    if (!bcId) continue;
    const existing = runsByBc.get(bcId);
    if (existing) existing.push(run);
    else runsByBc.set(bcId, [run]);
  }

  return {
    data: accounts.map((account) => ({
      ...account,
      creativeCount: creativeCounts.get(account.id) ?? 0,
      metrics: calculateMetrics(runsByBc.get(account.id) ?? []),
    })),
    error: runsRes.error,
  };
}

/** Totals across a set of already-derived rows, recomputing ratios from sums. */
export function totalsOf(items: { metrics: Metrics }[]): Metrics {
  const totals = items.reduce<MetricTotals>(
    (acc, item) => ({
      adSpend: acc.adSpend + item.metrics.adSpend,
      revenue: acc.revenue + item.metrics.revenue,
      tiktokClicks: acc.tiktokClicks + item.metrics.tiktokClicks,
      networkClicks: acc.networkClicks + item.metrics.networkClicks,
    }),
    { adSpend: 0, revenue: 0, tiktokClicks: 0, networkClicks: 0 }
  );
  return deriveMetrics(totals);
}

export { sumRuns };
