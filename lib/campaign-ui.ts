import type { Metrics } from "@/lib/metrics";

/**
 * Client-safe half of the campaign model: types and pure helpers, no Supabase
 * imports. The server-only reads live in lib/campaign-data.ts and the assembly
 * in lib/campaign-view.ts — both import from here, never the other way round.
 */

export type FlagStatus = "none" | "testing" | "scaling";

export const FLAG_CYCLE: FlagStatus[] = ["none", "testing", "scaling"];

export const FLAG_LABELS: Record<FlagStatus, string> = {
  none: "No flag",
  testing: "Testing",
  scaling: "Scaling",
};

export function nextFlag(current: FlagStatus): FlagStatus {
  const index = FLAG_CYCLE.indexOf(current);
  return FLAG_CYCLE[(index + 1) % FLAG_CYCLE.length];
}

export type CampaignSettings = {
  dailyBudget: number;
  isStarred: boolean;
  flagStatus: FlagStatus;
};

export const DEFAULT_SETTINGS: CampaignSettings = {
  dailyBudget: 0,
  isStarred: false,
  flagStatus: "none",
};

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
  dailyBudget: number;
  isStarred: boolean;
  flagStatus: FlagStatus;
  /** Trailing 7 days of revenue, oldest first. */
  sparkline: number[];
  /** Pre-formatted server-side so the client never recomputes a clock string. */
  lastActiveLabel: string | null;
  runningSinceLabel: string | null;
  runs: RunView[];
};

/* -------------------------------------------------------------------------- */
/*  Pure helpers                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Budget pace: spend so far against what the window allows
 * (daily budget × days in the window). Null when no budget is set — an unknown
 * pace must never render as 0%.
 */
export function budgetPace(
  adSpend: number,
  dailyBudget: number,
  days: number
): number | null {
  if (!Number.isFinite(dailyBudget) || dailyBudget <= 0) return null;
  const allowance = dailyBudget * Math.max(1, days);
  if (allowance <= 0) return null;
  return (adSpend / allowance) * 100;
}

const STATUS_RANK: Record<string, number> = { active: 0, paused: 1 };

const statusRank = (status: string | null) =>
  status !== null && status in STATUS_RANK ? STATUS_RANK[status] : 2;

/** Starred first, then active before paused, then profit descending. */
export function sortCampaignViews<
  T extends { isStarred: boolean; status: string | null; metrics: Metrics },
>(campaigns: T[]): T[] {
  return [...campaigns].sort((a, b) => {
    if (a.isStarred !== b.isStarred) return a.isStarred ? -1 : 1;
    const byStatus = statusRank(a.status) - statusRank(b.status);
    if (byStatus !== 0) return byStatus;
    return b.metrics.profit - a.metrics.profit;
  });
}
