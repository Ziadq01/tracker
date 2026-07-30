import "server-only";

import { formatRunDate } from "@/lib/campaign-data";
import type { CampaignSettings, CampaignView, RunView } from "@/lib/campaign-ui";
import { DEFAULT_SETTINGS } from "@/lib/campaign-ui";
import type { Period } from "@/lib/date-ranges";
import { calculateMetrics } from "@/lib/metrics";
import type { RunRow, TopCreative } from "@/lib/queries";

/**
 * Assembles the campaign table's view models.
 *
 * Composition and presentation only: it reuses the metrics lib/metrics.ts
 * already computes and attaches the display-only fields the table needs. No
 * formula is redefined here.
 */

/** Whole days covered by a period, minimum 1. */
export function daysInPeriod(period: Period): number {
  const ms = period.endAt.getTime() - period.startAt.getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

export function buildCampaignViews(opts: {
  ranked: TopCreative[];
  runs: RunRow[];
  settings: Map<string, CampaignSettings>;
  sparklines: Map<string, number[]>;
  sparklineLength: number;
  formatRelative: (iso: string | null) => string | null;
}): CampaignView[] {
  const { ranked, runs, settings, sparklines, sparklineLength } = opts;

  const runsByCreative = new Map<string, RunRow[]>();
  for (const run of runs) {
    const id = run.creative_id;
    if (!id) continue;
    const existing = runsByCreative.get(id);
    if (existing) existing.push(run);
    else runsByCreative.set(id, [run]);
  }

  return ranked.map((creative) => {
    const creativeRuns = runsByCreative.get(creative.id) ?? [];

    const timestamps = creativeRuns
      .map((r) => r.created_at)
      .filter((v): v is string => typeof v === "string" && v.length > 0)
      .sort();

    const runViews: RunView[] = [...creativeRuns]
      .sort((a, b) => (a.run_date < b.run_date ? 1 : -1))
      .map((run) => ({
        id: run.id,
        runDate: run.run_date,
        runDateLabel: formatRunDate(run.run_date),
        status: run.status,
        adSpend: Number(run.ad_spend ?? 0) || 0,
        revenue: Number(run.revenue ?? 0) || 0,
        tiktokClicks: Number(run.tiktok_clicks ?? 0) || 0,
        networkClicks: Number(run.network_clicks ?? 0) || 0,
        metrics: calculateMetrics([run]),
      }));

    const config = settings.get(creative.id) ?? DEFAULT_SETTINGS;

    return {
      id: creative.id,
      name: creative.name,
      status: creative.status,
      offerName: creative.offerName,
      bcAccountName: creative.bcAccountName,
      metrics: creative.metrics,
      dailyBudget: config.dailyBudget,
      isStarred: config.isStarred,
      flagStatus: config.flagStatus,
      sparkline:
        sparklines.get(creative.id) ??
        new Array<number>(sparklineLength).fill(0),
      // Newest and oldest run in the selected window — "running since" is
      // scoped to that window, not the campaign's whole lifetime.
      lastActiveLabel: opts.formatRelative(
        timestamps.length ? timestamps[timestamps.length - 1] : null
      ),
      runningSinceLabel: opts.formatRelative(
        timestamps.length ? timestamps[0] : null
      ),
      runs: runViews,
    };
  });
}
