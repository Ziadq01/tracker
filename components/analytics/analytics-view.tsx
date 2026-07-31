"use client";

import * as React from "react";

import { CampaignTable } from "@/components/analytics/campaign-table";
import { TrendChart } from "@/components/analytics/trend-chart";
import { FadeOnPending } from "@/components/motion/navigation-pending";
import type { CampaignView } from "@/lib/campaign-ui";
import type { DualPoint } from "@/lib/dual-series";
import { cn } from "@/lib/utils";

type Props = {
  campaigns: CampaignView[];
  /** Every campaign combined — the default view. */
  allPoints: DualPoint[];
  /** Per-campaign series, keyed by campaign id, bucketed identically. */
  seriesByCampaign: Record<string, DualPoint[]>;
};

/**
 * Owns which campaign the chart is scoped to.
 *
 * Selection is client state rather than a URL param: the server already sent
 * every campaign's series with the page, so switching between them is instant
 * and needs no refetch. Clicking a campaign's name selects it; clicking the
 * same name again, or "All", goes back to the combined view.
 */
export function AnalyticsView({
  campaigns,
  allPoints,
  seriesByCampaign,
}: Props) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Derived, so a selection that disappears on the next range falls back to
  // the combined view in the same render rather than charting nothing.
  const selected =
    selectedId !== null
      ? (campaigns.find((c) => c.id === selectedId) ?? null)
      : null;

  const points = selected
    ? (seriesByCampaign[selected.id] ?? [])
    : allPoints;

  const toggle = (id: string) =>
    setSelectedId((current) => (current === id ? null : id));

  return (
    <>
      <div>
        {/* Chart title: the scope the plot is showing. "All" is a control only
            when something is selected — otherwise it is just the label. */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pb-2">
          <h2 className="truncate text-xs font-bold text-foreground md:text-[13px]">
            {selected ? selected.name : "All campaigns"}
          </h2>

          {selected && (
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="inline-flex min-h-[44px] items-center text-2xs text-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline md:min-h-0"
            >
              All
            </button>
          )}

          <span
            className={cn(
              "text-2xs text-nav-muted",
              selected && "sr-only"
            )}
          >
            Tap a campaign name to isolate it
          </span>
        </div>

        <FadeOnPending>
          <TrendChart
            points={points}
            gradientId="analytics"
            // Remounts on scope change so the draw animation replays and the
            // gradient ids stay unique per series.
            key={selected ? selected.id : "all"}
          />
        </FadeOnPending>
      </div>

      <CampaignTable
        campaigns={campaigns}
        selectedId={selected?.id ?? null}
        onSelectCampaign={toggle}
      />
    </>
  );
}
