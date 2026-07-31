"use client";

import * as React from "react";

import { RunBreakdown } from "@/components/analytics/run-breakdown";
import { StatusBadge } from "@/components/metric-value";
import { setCampaignStatus } from "@/lib/actions";
import { sortCampaignViews, type CampaignView } from "@/lib/campaign-ui";
import { formatCurrency, formatNumber } from "@/lib/metrics";
import { profitTone } from "@/lib/tone-rules";
import { cn } from "@/lib/utils";

type Props = {
  campaigns: CampaignView[];
};

/** The six metric columns, in order. */
const COLUMNS = ["Spend", "Rev", "Profit", "EPC", "TT", "Net CPA"] as const;

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

  if (merged.length === 0) {
    return (
      <p className="border-t border-border py-10 text-center text-xs text-secondary">
        No campaign activity in this window.
      </p>
    );
  }

  return (
    <section>
      {error && (
        <p role="alert" className="pb-2 text-2xs text-loss">
          {error}
        </p>
      )}

      {/* Headers cover the six metric columns only; the name and status
          columns are self-evident and stay unlabelled. */}
      <div className="flex items-center gap-4 border-b border-border px-3 py-2">
        <div className="min-w-0 flex-1" />
        <div className="w-[5.5rem] shrink-0" />
        {COLUMNS.map((label) => (
          <div
            key={label}
            className="w-[5.5rem] shrink-0 text-right text-2xs uppercase tracking-header text-secondary"
          >
            {label}
          </div>
        ))}
      </div>

      <div>
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
                {/* Name, then offer · BC account and the activity stamps on
                    one subtitle line. */}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold text-foreground">
                    {campaign.name}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs text-secondary">
                    <span className="truncate">
                      {campaign.offerName ?? "No offer"}
                      {campaign.bcAccountName
                        ? ` · ${campaign.bcAccountName}`
                        : ""}
                    </span>
                    {campaign.lastActiveLabel && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="tnum">{campaign.lastActiveLabel}</span>
                      </>
                    )}
                    {!paused && campaign.runningLabel && (
                      <span className="tnum text-profit">
                        {campaign.runningLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status pill sits immediately before Spend and stays the
                    row's only control — clicking it toggles, not expands. */}
                <div className="w-[5.5rem] shrink-0">
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
                  >
                    <StatusBadge status={paused ? "paused" : "active"} />
                  </button>
                </div>

                <Metric>{formatCurrency(campaign.metrics.adSpend)}</Metric>
                <Metric>{formatCurrency(campaign.metrics.revenue)}</Metric>
                <Metric
                  className={cn(
                    profitTone(campaign.metrics.profit) === "profit" &&
                      "text-profit",
                    profitTone(campaign.metrics.profit) === "loss" &&
                      "text-loss"
                  )}
                >
                  {formatCurrency(campaign.metrics.profit)}
                </Metric>
                <Metric>{formatCurrency(campaign.metrics.epc)}</Metric>
                <Metric>{formatNumber(campaign.metrics.tiktokClicks)}</Metric>
                <Metric>{formatCurrency(campaign.metrics.networkCpa)}</Metric>
              </div>

              {isOpen && (
                <RunBreakdown campaignId={campaign.id} runs={campaign.runs} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Right-aligned metric cell. Only profit ever takes a colour. */
function Metric({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="w-[5.5rem] shrink-0 text-right">
      <span className={cn("tnum text-[13px] text-foreground", className)}>
        {children}
      </span>
    </div>
  );
}
