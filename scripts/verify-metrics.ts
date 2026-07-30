import assert from "node:assert/strict";

import {
  calculateMetrics,
  dropoffPct,
  epc,
  networkCpa,
  percentChange,
  profit,
  roas,
  safeDivide,
  tiktokCpa,
  toneFromThreshold,
  toneFromValue,
  formatCurrency,
  formatRatio,
} from "@/lib/metrics";
import { resolveRange, shiftDateKey, toDateKey } from "@/lib/date-ranges";
import { buildComparisonSeries } from "@/lib/series";

let passed = 0;
const check = (name: string, fn: () => void) => {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
};

console.log("\n-- formulas --");

check("Network CPA = ad_spend / network_clicks", () => {
  assert.equal(networkCpa(100, 40), 2.5);
});

check("TikTok CPA = ad_spend / tiktok_clicks", () => {
  assert.equal(tiktokCpa(100, 200), 0.5);
});

check("Dropoff % = ((tt - nw) / tt) * 100", () => {
  assert.equal(dropoffPct(1000, 650), 35);
});

check("EPC = revenue / network_clicks", () => {
  assert.equal(epc(250, 500), 0.5);
});

check("Profit = revenue - ad_spend", () => {
  assert.equal(profit(250, 100), 150);
  assert.equal(profit(50, 100), -50);
});

check("ROAS = revenue / ad_spend", () => {
  assert.equal(roas(250, 100), 2.5);
});

console.log("\n-- divide-by-zero never leaks Infinity/NaN --");

check("safeDivide returns null on zero denominator", () => {
  assert.equal(safeDivide(5, 0), null);
  assert.equal(safeDivide(0, 0), null);
});

check("ratios are null when clicks/spend are zero", () => {
  const m = calculateMetrics([
    { ad_spend: 120, revenue: 0, tiktok_clicks: 0, network_clicks: 0 },
  ]);
  assert.equal(m.networkCpa, null);
  assert.equal(m.tiktokCpa, null);
  assert.equal(m.epc, null);
  assert.equal(m.dropoffPct, null);
  assert.equal(m.roas, 0); // revenue 0 / spend 120 is a real 0, not undefined
  assert.equal(m.profit, -120);
});

check("null ratios format as an em dash, not NaN", () => {
  assert.equal(formatCurrency(null), "—");
  assert.equal(formatRatio(null), "—");
  assert.equal(formatCurrency(-1234.5), "-$1,234.50");
  assert.equal(formatRatio(2.5), "2.50x");
});

console.log("\n-- aggregation --");

check("ratios recompute from sums, never average per-row ratios", () => {
  // Row A: EPC 10.00 (100/10). Row B: EPC 0.10 (10/100).
  // Averaging the ratios gives 5.05; the correct pooled EPC is 110/110 = 1.00.
  const m = calculateMetrics([
    { ad_spend: 50, revenue: 100, tiktok_clicks: 20, network_clicks: 10 },
    { ad_spend: 50, revenue: 10, tiktok_clicks: 200, network_clicks: 100 },
  ]);
  assert.equal(m.revenue, 110);
  assert.equal(m.networkClicks, 110);
  assert.equal(m.epc, 1);
  assert.equal(m.adSpend, 100);
  assert.equal(m.roas, 1.1);
});

check("PostgREST string numerics are coerced", () => {
  const m = calculateMetrics([
    {
      ad_spend: "100.50" as unknown as number,
      revenue: "250.25" as unknown as number,
      tiktok_clicks: "300" as unknown as number,
      network_clicks: "150" as unknown as number,
    },
  ]);
  assert.equal(m.adSpend, 100.5);
  assert.equal(m.revenue, 250.25);
  assert.equal(m.tiktokClicks, 300);
});

check("empty input yields zeros and null ratios, not NaN", () => {
  const m = calculateMetrics([]);
  assert.equal(m.adSpend, 0);
  assert.equal(m.profit, 0);
  assert.equal(m.roas, null);
  assert.equal(m.epc, null);
});

console.log("\n-- tone rules --");

check("profit tone keys off zero", () => {
  assert.equal(toneFromValue(10), "profit");
  assert.equal(toneFromValue(-10), "loss");
  assert.equal(toneFromValue(0), "neutral");
  assert.equal(toneFromValue(null), "neutral");
});

check("ROAS tone keys off break-even, not zero", () => {
  assert.equal(toneFromThreshold(1.4, 1), "profit");
  assert.equal(toneFromThreshold(0.8, 1), "loss");
  assert.equal(toneFromThreshold(null, 1), "neutral");
});

check("percentChange is null against a zero baseline", () => {
  assert.equal(percentChange(150, 100), 50);
  assert.equal(percentChange(50, 100), -50);
  assert.equal(percentChange(10, 0), null);
});

console.log("\n-- date ranges --");

const NOW = new Date("2026-07-30T18:20:00Z"); // 14:20 in America/New_York

check("Today's previous period is yesterday", () => {
  const r = resolveRange({ range: "today", now: NOW });
  assert.equal(r.current.startDate, "2026-07-30");
  assert.equal(r.current.endDate, "2026-07-30");
  assert.equal(r.previous.startDate, "2026-07-29");
  assert.equal(r.previous.endDate, "2026-07-29");
});

check("7D covers 7 days and compares to the prior 7", () => {
  const r = resolveRange({ range: "7d", now: NOW });
  assert.equal(r.current.startDate, "2026-07-24");
  assert.equal(r.current.endDate, "2026-07-30");
  assert.equal(r.previous.startDate, "2026-07-17");
  assert.equal(r.previous.endDate, "2026-07-23");
});

check("30D covers 30 days and compares to the prior 30", () => {
  const r = resolveRange({ range: "30d", now: NOW });
  assert.equal(r.current.startDate, "2026-07-01");
  assert.equal(r.current.endDate, "2026-07-30");
  assert.equal(r.previous.startDate, "2026-06-01");
  assert.equal(r.previous.endDate, "2026-06-30");
});

check("periods are half-open — endAt is midnight of the next day", () => {
  const r = resolveRange({ range: "today", now: NOW });
  const spanHours =
    (r.current.endAt.getTime() - r.current.startAt.getTime()) / 3_600_000;
  assert.equal(spanHours, 24);
});

check("This Hour is a one-hour window vs the hour before", () => {
  const r = resolveRange({ range: "hour", now: NOW });
  assert.equal(r.intraday, true);
  assert.equal(
    (r.current.endAt.getTime() - r.current.startAt.getTime()) / 60_000,
    60
  );
  assert.equal(r.previous.endAt.getTime(), r.current.startAt.getTime());
});

check("custom range compares against an equally long prior window", () => {
  const r = resolveRange({
    range: "custom",
    from: "2026-07-10",
    to: "2026-07-14",
    now: NOW,
  });
  assert.equal(r.current.startDate, "2026-07-10");
  assert.equal(r.current.endDate, "2026-07-14");
  assert.equal(r.previous.startDate, "2026-07-05");
  assert.equal(r.previous.endDate, "2026-07-09");
});

check("reversed custom range is normalised", () => {
  const r = resolveRange({
    range: "custom",
    from: "2026-07-14",
    to: "2026-07-10",
    now: NOW,
  });
  assert.equal(r.current.startDate, "2026-07-10");
  assert.equal(r.current.endDate, "2026-07-14");
});

check("an unknown granularity falls back instead of throwing", () => {
  const r = resolveRange({ range: "30d", granularity: "hourly", now: NOW });
  assert.equal(r.granularity, "daily"); // hourly isn't offered for 30D
});

check("date keys shift across a month boundary", () => {
  assert.equal(shiftDateKey("2026-03-01", -1), "2026-02-28");
  assert.equal(shiftDateKey("2026-12-31", 1), "2027-01-01");
});

check("DST spring-forward day still resolves a 23h local day", () => {
  // 2026-03-08 is the US spring-forward date.
  const r = resolveRange({
    range: "custom",
    from: "2026-03-08",
    to: "2026-03-08",
    now: NOW,
  });
  const hours =
    (r.current.endAt.getTime() - r.current.startAt.getTime()) / 3_600_000;
  assert.equal(hours, 23);
});

console.log("\n-- comparison series --");

const mkRun = (date: string, hour: number, revenue: number) => ({
  run_date: date,
  created_at: `${date}T${String(hour).padStart(2, "0")}:30:00Z`,
  ad_spend: revenue / 2,
  revenue,
  tiktok_clicks: 100,
  network_clicks: 60,
});

check("daily buckets align current and previous by index", () => {
  const range = resolveRange({ range: "7d", granularity: "daily", now: NOW });
  const { points, unit } = buildComparisonSeries({
    range,
    now: NOW,
    currentRuns: [mkRun("2026-07-24", 12, 500), mkRun("2026-07-25", 12, 700)],
    previousRuns: [mkRun("2026-07-17", 12, 300)],
  });

  assert.equal(unit, "day");
  assert.equal(points.length, 7);
  assert.equal(points[0].current, 500);
  assert.equal(points[0].previous, 300);
  assert.equal(points[1].current, 700);
  assert.equal(points[1].previous, 0);
});

check("empty buckets stay in the series so the x-axis is continuous", () => {
  const range = resolveRange({ range: "7d", granularity: "daily", now: NOW });
  const { points } = buildComparisonSeries({
    range,
    now: NOW,
    currentRuns: [mkRun("2026-07-26", 12, 100)],
    previousRuns: [],
  });
  assert.equal(points.length, 7);
  assert.equal(points[1].current, 0);
  assert.equal(points[2].current, 100);
});

check("runs in the same bucket are summed", () => {
  const range = resolveRange({ range: "7d", granularity: "daily", now: NOW });
  const { points } = buildComparisonSeries({
    range,
    now: NOW,
    currentRuns: [mkRun("2026-07-24", 3, 200), mkRun("2026-07-24", 20, 300)],
    previousRuns: [],
  });
  assert.equal(points[0].current, 500);
});

check("future buckets are null so the line stops at now", () => {
  const range = resolveRange({ range: "today", granularity: "hourly", now: NOW });
  const { points, unit } = buildComparisonSeries({
    range,
    now: NOW,
    currentRuns: [],
    previousRuns: [],
  });
  assert.equal(unit, "hour");
  assert.equal(points.length, 24);
  // 14:20 local -> hours 15..23 have not happened yet.
  assert.equal(points[14].current, 0);
  assert.equal(points[15].current, null);
  assert.equal(points[23].current, null);
  // The previous period is complete, so it keeps its values.
  assert.equal(points[23].previous, 0);
});

check("This Hour buckets into 12 five-minute slots", () => {
  const range = resolveRange({ range: "hour", now: NOW });
  const { points, unit } = buildComparisonSeries({
    range,
    now: NOW,
    currentRuns: [],
    previousRuns: [],
  });
  assert.equal(unit, "minute5");
  assert.equal(points.length, 12);
});

console.log(`\n${passed} checks passed\n`);
