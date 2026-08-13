/**
 * Scaler metric definitions.
 *
 * Every derived number in the app comes from this file. Ratios return `null`
 * rather than Infinity/NaN when the denominator is zero, so the UI can render
 * an explicit "—" instead of a lie (a creative with spend but no clicks has an
 * *unknown* CPA, not an infinite one).
 */

/**
 * PostgREST can hand back `numeric` columns as strings, so the numeric fields
 * accept both and are coerced on the way in.
 */
export type RunLike = {
  ad_spend: number | string | null;
  revenue: number | string | null;
  tiktok_clicks: number | string | null;
  network_clicks: number | string | null;
};

export type MetricTotals = {
  adSpend: number;
  revenue: number;
  tiktokClicks: number;
  networkClicks: number;
};

export type Metrics = MetricTotals & {
  profit: number;
  roas: number | null;
  epc: number | null;
  networkCpa: number | null;
  tiktokCpa: number | null;
  dropoffPct: number | null;
};

const num = (v: number | string | null | undefined): number => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
};

/** Division that refuses to produce Infinity or NaN. */
export function safeDivide(
  numerator: number,
  denominator: number
): number | null {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) return null;
  if (denominator === 0) return null;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : null;
}

/* -------------------------------------------------------------------------- */
/*  Core formulas                                                             */
/* -------------------------------------------------------------------------- */

/** Network CPA = ad_spend / network_clicks */
export const networkCpa = (adSpend: number, networkClicks: number) =>
  safeDivide(adSpend, networkClicks);

/** TikTok CPA = ad_spend / tiktok_clicks */
export const tiktokCpa = (adSpend: number, tiktokClicks: number) =>
  safeDivide(adSpend, tiktokClicks);

/** Dropoff % = ((tiktok_clicks - network_clicks) / tiktok_clicks) * 100 */
export function dropoffPct(
  tiktokClicks: number,
  networkClicks: number
): number | null {
  const ratio = safeDivide(tiktokClicks - networkClicks, tiktokClicks);
  return ratio === null ? null : ratio * 100;
}

/** EPC = revenue / network_clicks */
export const epc = (revenue: number, networkClicks: number) =>
  safeDivide(revenue, networkClicks);

/** Profit = revenue - ad_spend */
export const profit = (revenue: number, adSpend: number) => revenue - adSpend;

/** ROAS = revenue / ad_spend */
export const roas = (revenue: number, adSpend: number) =>
  safeDivide(revenue, adSpend);

/* -------------------------------------------------------------------------- */
/*  Aggregation                                                               */
/* -------------------------------------------------------------------------- */

export const EMPTY_TOTALS: MetricTotals = {
  adSpend: 0,
  revenue: 0,
  tiktokClicks: 0,
  networkClicks: 0,
};

/** Sum raw run rows into totals. Ratios are never averaged — always recomputed. */
export function sumRuns(runs: RunLike[]): MetricTotals {
  return runs.reduce<MetricTotals>(
    (acc, run) => ({
      adSpend: acc.adSpend + num(run.ad_spend),
      revenue: acc.revenue + num(run.revenue),
      tiktokClicks: acc.tiktokClicks + num(run.tiktok_clicks),
      networkClicks: acc.networkClicks + num(run.network_clicks),
    }),
    { ...EMPTY_TOTALS }
  );
}

/** Derive the full metric set from a set of totals. */
export function deriveMetrics(totals: MetricTotals): Metrics {
  return {
    ...totals,
    profit: profit(totals.revenue, totals.adSpend),
    roas: roas(totals.revenue, totals.adSpend),
    epc: epc(totals.revenue, totals.networkClicks),
    networkCpa: networkCpa(totals.adSpend, totals.networkClicks),
    tiktokCpa: tiktokCpa(totals.adSpend, totals.tiktokClicks),
    dropoffPct: dropoffPct(totals.tiktokClicks, totals.networkClicks),
  };
}

/** Convenience: raw rows in, full metric set out. */
export function calculateMetrics(runs: RunLike[]): Metrics {
  return deriveMetrics(sumRuns(runs));
}

/* -------------------------------------------------------------------------- */
/*  Period-over-period                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Percent change between two values. Returns null when the baseline is 0 —
 * "up from nothing" has no meaningful percentage.
 */
export function percentChange(
  current: number | null,
  previous: number | null
): number | null {
  if (current === null || previous === null) return null;
  const ratio = safeDivide(current - previous, Math.abs(previous));
  return ratio === null ? null : ratio * 100;
}

/* -------------------------------------------------------------------------- */
/*  Formatting                                                                */
/* -------------------------------------------------------------------------- */

const DASH = "—";

export function formatCurrency(
  value: number | null,
  opts: { decimals?: number; compact?: boolean } = {}
): string {
  if (value === null || !Number.isFinite(value)) return DASH;
  const { decimals = 2, compact = false } = opts;
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (compact && abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (compact && abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;

  return `${sign}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function formatNumber(value: number | null, decimals = 0): string {
  if (value === null || !Number.isFinite(value)) return DASH;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(value: number | null, decimals = 1): string {
  if (value === null || !Number.isFinite(value)) return DASH;
  return `${value.toFixed(decimals)}%`;
}

/** ROAS renders as a multiplier: 2.41x */
export function formatRatio(value: number | null, decimals = 2): string {
  if (value === null || !Number.isFinite(value)) return DASH;
  return `${value.toFixed(decimals)}x`;
}

export function formatDelta(value: number | null, decimals = 1): string {
  if (value === null || !Number.isFinite(value)) return DASH;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

/* -------------------------------------------------------------------------- */
/*  Tone                                                                      */
/* -------------------------------------------------------------------------- */

export type Tone = "profit" | "loss" | "neutral";

/** Profit-style tone: positive is green, negative is red. */
export function toneFromValue(value: number | null): Tone {
  if (value === null || !Number.isFinite(value) || value === 0) return "neutral";
  return value > 0 ? "profit" : "loss";
}

/** ROAS-style tone: break-even (1.0x) is the dividing line, not zero. */
export function toneFromThreshold(
  value: number | null,
  threshold: number
): Tone {
  if (value === null || !Number.isFinite(value)) return "neutral";
  if (value === threshold) return "neutral";
  return value > threshold ? "profit" : "loss";
}
