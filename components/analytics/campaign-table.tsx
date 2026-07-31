"use client";

import * as React from "react";

import { RunBreakdown } from "@/components/analytics/run-breakdown";
import { StatusBadge } from "@/components/metric-value";
import { setCampaignStatus } from "@/lib/actions";
import { sortCampaignViews, type CampaignView } from "@/lib/campaign-ui";
import { formatCurrency, formatNumber, formatRatio } from "@/lib/metrics";
import { profitTone, roasTone, type Tone } from "@/lib/tone-rules";
import { cn } from "@/lib/utils";

type Props = {
  campaigns: CampaignView[];
};

/** Metric columns, in order. TT = TikTok clicks, NET = network clicks. */
const COLUMNS = ["Spend", "Rev", "Profit", "ROAS", "TT", "Net", "CPA"] as const;

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

      <div className="flex items-center gap-4 border-b border-border px-3 py-2 text-2xs uppercase tracking-header text-secondary">
        <div className="min-w-0 flex-1">Camp</div>
        <div className="w-[5.5rem] shrink-0">Status</div>
        {COLUMNS.map((label) => (
          <div key={label} className="w-[5.5rem] shrink-0 text-right">
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
                      {campaign.bcAccountName ?? "No BC account"}
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
                <Metric className={toneClass(profitTone(campaign.metrics.profit))}>
                  {formatCurrency(campaign.metrics.profit)}
                </Metric>

                {/* ROAS keys off break-even (1x), not zero. */}
                <Metric className={toneClass(roasTone(campaign.metrics.roas))}>
                  {formatRatio(campaign.metrics.roas)}
                </Metric>

                <Metric>{formatNumber(campaign.metrics.tiktokClicks)}</Metric>
                <Metric>{formatNumber(campaign.metrics.networkClicks)}</Metric>
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

/** Maps a tone to its text colour; neutral keeps the default foreground. */
function toneClass(tone: Tone): string | undefined {
  if (tone === "profit") return "text-profit";
  if (tone === "loss") return "text-loss";
  return undefined;
}

/** Right-aligned metric cell. Only profit and ROAS take a colour. */
function Metric({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="w-[5.5rem] shrink-0 text-right">
      <span className={cn("tnum text-[13px]", className ?? "text-foreground")}>
        {children}
      </span>
    </div>
  );
}
