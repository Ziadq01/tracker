import "server-only";

import { formatInTimeZone } from "date-fns-tz";

import type { CampaignView, RunView } from "@/lib/campaign-ui";
import { calculateMetrics } from "@/lib/metrics";
import type { RunRow, TopCreative } from "@/lib/queries";

/**
 * Assembles the campaign table's view models.
 *
 * Composition and presentation only: it reuses the metrics lib/metrics.ts
 * already computes and groups the runs each campaign expands to. No formula is
 * redefined here.
 */

/** Short display label for a run's business date. */
function formatRunDate(dateKey: string): string {
  return formatInTimeZone(new Date(`${dateKey}T12:00:00Z`), "UTC", "MMM d");
}

export function buildCampaignViews(opts: {
  ranked: TopCreative[];
  runs: RunRow[];
}): CampaignView[] {
  const { ranked, runs } = opts;

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

    return {
      id: creative.id,
      name: creative.name,
      status: creative.status,
      offerName: creative.offerName,
      bcAccountName: creative.bcAccountName,
      metrics: creative.metrics,
      runs: runViews,
    };
  });
}
