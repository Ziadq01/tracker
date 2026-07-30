import type { TopCreative } from "@/lib/queries";

/**
 * Display ordering for the Active Campaigns table: active first, then paused,
 * then anything with an unrecognised status; profit descending inside each
 * group.
 *
 * This is presentation only — it reorders rows that lib/queries.ts already
 * ranked, and computes nothing.
 */
const STATUS_RANK: Record<string, number> = {
  active: 0,
  paused: 1,
};

const rankOf = (status: string | null) =>
  status !== null && status in STATUS_RANK ? STATUS_RANK[status] : 2;

export function sortCampaigns(campaigns: TopCreative[]): TopCreative[] {
  return [...campaigns].sort((a, b) => {
    const byStatus = rankOf(a.status) - rankOf(b.status);
    if (byStatus !== 0) return byStatus;
    return b.metrics.profit - a.metrics.profit;
  });
}
