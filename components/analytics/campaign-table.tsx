"use client";

import * as React from "react";

import { RunBreakdown } from "@/components/analytics/run-breakdown";
import { StatusBadge } from "@/components/metric-value";
import { setCampaignStatus } from "@/lib/actions";
import { sortCampaignViews, type CampaignView } from "@/lib/campaign-ui";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRatio,
} from "@/lib/metrics";
import { profitTone } from "@/lib/tone-rules";
import { cn } from "@/lib/utils";

type Props = {
  campaigns: CampaignView[];
};

export function CampaignTable({ campaigns }: Props) {
  const [statuses, setStatuses] = React.useState<
    Record<string, "active" | "paused">
  >({});
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  // Server data wins on every refresh; the local map only covers the gap
  // between a click and the revalidation landing.
  React.useEffect(() => {
    setStatuses({});
  }, [campaigns]);

  const merged = React.useMemo(
    () =>
      sortCampaignViews(
        campaigns.map((campaign) => ({
          ...campaign,
          status: statuses[campaign.id] ?? campaign.status,
        }))
      ),
    [campaigns, statuses]
  );

  /** Flip locally, then persist. Roll back and explain if the write fails. */
  const toggleStatus = (id: string, next: "active" | "paused") => {
    setError(null);
    setStatuses((prev) => ({ ...prev, [id]: next }));

    startTransition(async () => {
      const result = await setCampaignStatus(id, next);
      if (!result.ok) {
        setStatuses((prev) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
        setError(result.error);
      }
    });
  };

  return (
    <section>
      {/* No heading — the table stands on its own. The error line only appears
          when a write fails. */}
      {error && (
        <p role="alert" className="pb-2 text-2xs text-loss">
          {error}
        </p>
      )}

      {merged.length === 0 ? (
        <p className="border-t border-border py-10 text-center text-xs text-secondary">
          No campaign activity in this window.
        </p>
      ) : (
        <div className="border-t border-border">
          {merged.map((campaign) => {
            const isOpen = expanded[campaign.id] ?? false;
            const paused = campaign.status === "paused";

            return (
              <div key={campaign.id} className="border-b border-border">
                <div
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                  onClick={() =>
                    setExpanded((p) => ({ ...p, [campaign.id]: !isOpen }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setExpanded((p) => ({ ...p, [campaign.id]: !isOpen }));
                    }
                  }}
                  className="flex w-full cursor-pointer items-center gap-4 px-3 py-3 text-left transition-colors hover:bg-hover"
                >
                  {/* Name + context */}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-bold text-foreground">
                      {campaign.name}
                    </div>
                    <div className="truncate text-xs text-secondary">
                      {campaign.offerName ?? "No offer"}
                      {campaign.bcAccountName
                        ? ` · ${campaign.bcAccountName}`
                        : ""}
                    </div>
                  </div>

                  {/* Status pill sits immediately before spend and stays the
                      row's only control — clicking it toggles, not expands. */}
                  <button
                    type="button"
                    aria-label={paused ? "Activate campaign" : "Pause campaign"}
                    title={
                      paused
                        ? "Paused — click to activate"
                        : "Active — click to pause"
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleStatus(campaign.id, paused ? "active" : "paused");
                    }}
                    onKeyDown={(event) => event.stopPropagation()}
                    className="shrink-0"
                  >
                    <StatusBadge status={paused ? "paused" : "active"} />
                  </button>

                  <Metric className="w-[6rem]">
                    {formatCurrency(campaign.metrics.adSpend)}
                  </Metric>
                  <Metric className="w-[6rem]">
                    {formatCurrency(campaign.metrics.revenue)}
                  </Metric>

                  {/* Profit is the only coloured number; ROAS trails it. */}
                  <div className="flex w-[8rem] shrink-0 items-baseline justify-end gap-1.5">
                    <span
                      className={cn(
                        "tnum text-[13px]",
                        profitTone(campaign.metrics.profit) === "profit"
                          ? "text-profit"
                          : profitTone(campaign.metrics.profit) === "loss"
                            ? "text-loss"
                            : "text-foreground"
                      )}
                    >
                      {formatCurrency(campaign.metrics.profit)}
                    </span>
                    <span className="tnum text-[11px] text-secondary">
                      {formatRatio(campaign.metrics.roas)}
                    </span>
                  </div>

                  <Metric className="hidden w-[4.5rem] sm:block">
                    {formatCurrency(campaign.metrics.epc)}
                  </Metric>
                  <Metric className="hidden w-[4.5rem] lg:block">
                    {formatCurrency(campaign.metrics.networkCpa)}
                  </Metric>
                  <Metric className="hidden w-[4rem] lg:block">
                    {formatPercent(campaign.metrics.dropoffPct)}
                  </Metric>
                  <Metric className="hidden w-[4.5rem] xl:block">
                    {formatNumber(campaign.metrics.tiktokClicks)}
                  </Metric>
                  <Metric className="hidden w-[4.5rem] xl:block">
                    {formatNumber(campaign.metrics.networkClicks)}
                  </Metric>

                  {/* Last active (muted) over running duration (green). */}
                  <div className="hidden w-[4.5rem] shrink-0 text-right xl:block">
                    <div className="tnum text-2xs text-secondary">
                      {campaign.lastActiveLabel ?? "—"}
                    </div>
                    <div className="tnum text-2xs text-profit">
                      {paused ? "" : (campaign.runningLabel ?? "")}
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <RunBreakdown
                    campaignId={campaign.id}
                    runs={campaign.runs}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Right-aligned, uncoloured metric cell. */
function Metric({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("shrink-0 text-right", className)}>
      <span className="tnum text-[13px] text-foreground">{children}</span>
    </div>
  );
}
