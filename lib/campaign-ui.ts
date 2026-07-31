import type { Metrics } from "@/lib/metrics";

/**
 * Client-safe half of the campaign model: types and pure helpers, no Supabase
 * imports. The assembly lives in lib/campaign-view.ts, which imports from here
 * and never the other way round.
 */

export type RunView = {
  id: string;
  /** yyyy-MM-dd, used to populate the edit form's date input. */
  runDate: string;
  /** Short display label ("Jul 30") — the raw key wraps in a narrow column. */
  runDateLabel: string;
  status: string | null;
  adSpend: number;
  revenue: number;
  tiktokClicks: number;
  networkClicks: number;
  metrics: Metrics;
};

export type CampaignView = {
  id: string;
  name: string;
  status: string | null;
  offerName: string | null;
  bcAccountName: string | null;
  metrics: Metrics;
  /** Pre-formatted server-side so the client never recomputes a clock string. */
  lastActiveLabel: string | null;
  runningLabel: string | null;
  runs: RunView[];
};

const STATUS_RANK: Record<string, number> = { active: 0, paused: 1 };

const statusRank = (status: string | null) =>
  status !== null && status in STATUS_RANK ? STATUS_RANK[status] : 2;

/** Active before paused, then profit descending. */
export function sortCampaignViews<
  T extends { status: string | null; metrics: Metrics },
>(campaigns: T[]): T[] {
  return [...campaigns].sort((a, b) => {
    const byStatus = statusRank(a.status) - statusRank(b.status);
    if (byStatus !== 0) return byStatus;
    return b.metrics.profit - a.metrics.profit;
  });
}
