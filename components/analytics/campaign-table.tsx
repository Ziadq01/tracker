"use client";

import * as React from "react";

import { BudgetBar } from "@/components/analytics/budget-bar";
import { RunBreakdown } from "@/components/analytics/run-breakdown";
import {
  ChevronIcon,
  FlagIcon,
  StarIcon,
} from "@/components/analytics/row-icons";
import { Sparkline } from "@/components/analytics/sparkline";
import {
  setCampaignFlag,
  setCampaignStarred,
  setCampaignStatus,
} from "@/lib/actions";
import {
  budgetPace,
  nextFlag,
  sortCampaignViews,
  FLAG_LABELS,
  type CampaignView,
  type FlagStatus,
} from "@/lib/campaign-ui";
import { formatCurrency, formatPercent, formatRatio } from "@/lib/metrics";
import { profitTone } from "@/lib/tone-rules";
import { cn } from "@/lib/utils";

type Props = {
  campaigns: CampaignView[];
  days: number;
};

/** Per-campaign fields the user can flip locally before the server confirms. */
type Overrides = {
  status?: "active" | "paused";
  isStarred?: boolean;
  flagStatus?: FlagStatus;
};

export function CampaignTable({ campaigns, days }: Props) {
  const [overrides, setOverrides] = React.useState<Record<string, Overrides>>(
    {}
  );
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [, startTransition] = React.useTransition();

  // Server data wins on every refresh; overrides only cover the gap between a
  // click and the revalidation landing.
  React.useEffect(() => {
    setOverrides({});
  }, [campaigns]);

  const merged = React.useMemo(
    () =>
      sortCampaignViews(
        campaigns.map((campaign) => ({
          ...campaign,
          ...overrides[campaign.id],
        }))
      ),
    [campaigns, overrides]
  );

  /**
   * Applies the change locally, then calls the server. If the write fails the
   * local change is rolled back and the reason surfaced.
   */
  const optimistic = React.useCallback(
    (id: string, patch: Overrides, run: () => Promise<{ ok: boolean; error?: string }>) => {
      setError(null);
      setOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

      startTransition(async () => {
        const result = await run();
        if (!result.ok) {
          setOverrides((prev) => {
            const next = { ...prev };
            const entry = { ...next[id] };
            for (const key of Object.keys(patch)) {
              delete entry[key as keyof Overrides];
            }
            if (Object.keys(entry).length === 0) delete next[id];
            else next[id] = entry;
            return next;
          });
          setError(result.error ?? "Update failed.");
        }
      });
    },
    []
  );

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4 pb-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">
            Active Campaigns
          </h2>
          <p className="text-2xs text-secondary">
            Starred first, then active, then by profit · click a row for its runs
          </p>
        </div>
        {error && (
          <p role="alert" className="text-2xs text-loss">
            {error}
          </p>
        )}
      </div>

      {merged.length === 0 ? (
        <p className="border-t border-border py-10 text-center text-xs text-secondary">
          No campaign activity in this window.
        </p>
      ) : (
        <div className="border-t border-border">
          {merged.map((campaign) => {
            const isOpen = expanded[campaign.id] ?? false;
            const paused = campaign.status === "paused";
            const pace = budgetPace(
              campaign.metrics.adSpend,
              campaign.dailyBudget,
              days
            );

            return (
              <div key={campaign.id} className="border-b border-border">
                {/* The row is a button so the whole thing is clickable and
                    keyboard-reachable; the controls stop propagation. */}
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
                  className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-hover"
                >
                  {/* Star */}
                  <ControlButton
                    label={campaign.isStarred ? "Unstar campaign" : "Star campaign"}
                    onClick={() =>
                      optimistic(
                        campaign.id,
                        { isStarred: !campaign.isStarred },
                        () =>
                          setCampaignStarred(campaign.id, !campaign.isStarred)
                      )
                    }
                    className={
                      campaign.isStarred
                        ? "text-foreground"
                        : "text-secondary opacity-40 hover:opacity-100"
                    }
                  >
                    <StarIcon filled={campaign.isStarred} />
                  </ControlButton>

                  {/* Flag */}
                  <ControlButton
                    label={`Flag: ${FLAG_LABELS[campaign.flagStatus]}`}
                    onClick={() => {
                      const next = nextFlag(campaign.flagStatus);
                      optimistic(campaign.id, { flagStatus: next }, () =>
                        setCampaignFlag(campaign.id, next)
                      );
                    }}
                    className={cn(
                      campaign.flagStatus === "testing" && "text-flag-testing",
                      campaign.flagStatus === "scaling" && "text-profit",
                      campaign.flagStatus === "none" &&
                        "text-secondary opacity-40 hover:opacity-100"
                    )}
                  >
                    <FlagIcon filled={campaign.flagStatus !== "none"} />
                  </ControlButton>

                  {/* Status dot toggles the campaign */}
                  <ControlButton
                    label={
                      paused ? "Activate campaign" : "Pause campaign"
                    }
                    onClick={() => {
                      const next = paused ? "active" : "paused";
                      optimistic(campaign.id, { status: next }, () =>
                        setCampaignStatus(campaign.id, next)
                      );
                    }}
                    className="gap-1.5"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        paused ? "bg-secondary" : "bg-profit"
                      )}
                    />
                    <span
                      className={cn(
                        "text-xs",
                        paused ? "text-secondary" : "text-profit"
                      )}
                    >
                      {paused ? "Paused" : "Active"}
                    </span>
                  </ControlButton>

                  {/* Name */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-secondary">
                        <ChevronIcon open={isOpen} />
                      </span>
                      <span className="truncate text-xs text-foreground">
                        {campaign.name}
                      </span>
                    </div>
                    <div className="truncate pl-[18px] text-2xs text-secondary">
                      {campaign.offerName ?? "No offer"}
                      {campaign.bcAccountName
                        ? ` · ${campaign.bcAccountName}`
                        : ""}
                    </div>
                  </div>

                  {/* Spend + budget pace */}
                  <div className="w-[5.5rem] shrink-0 text-right">
                    <span className="tnum text-xs text-foreground">
                      {formatCurrency(campaign.metrics.adSpend)}
                    </span>
                    <BudgetBar
                      pace={pace}
                      title={
                        pace === null
                          ? "No daily budget set"
                          : `${formatPercent(pace, 0)} of ${formatCurrency(campaign.dailyBudget, { decimals: 0 })}/day over ${days}d`
                      }
                    />
                  </div>

                  {/* Revenue */}
                  <Cell className="w-[5.5rem]">
                    {formatCurrency(campaign.metrics.revenue)}
                  </Cell>

                  {/* Profit + ROAS merged */}
                  <div className="flex w-[7.5rem] shrink-0 items-baseline justify-end gap-1.5">
                    <span
                      className={cn(
                        "tnum text-xs",
                        profitTone(campaign.metrics.profit) === "profit"
                          ? "text-profit"
                          : profitTone(campaign.metrics.profit) === "loss"
                            ? "text-loss"
                            : "text-foreground"
                      )}
                    >
                      {formatCurrency(campaign.metrics.profit)}
                    </span>
                    <span className="tnum text-2xs text-secondary">
                      {formatRatio(campaign.metrics.roas)}
                    </span>
                  </div>

                  <Cell className="hidden w-[4rem] sm:block">
                    {formatCurrency(campaign.metrics.epc, { decimals: 3 })}
                  </Cell>
                  <Cell className="hidden w-[4rem] lg:block">
                    {formatCurrency(campaign.metrics.networkCpa, {
                      decimals: 3,
                    })}
                  </Cell>
                  <Cell className="hidden w-[4rem] lg:block">
                    {formatCurrency(campaign.metrics.tiktokCpa, {
                      decimals: 3,
                    })}
                  </Cell>
                  <Cell className="hidden w-[3.5rem] lg:block">
                    {formatPercent(campaign.metrics.dropoffPct)}
                  </Cell>

                  {/* Sparkline */}
                  <div className="hidden w-[40px] shrink-0 md:block">
                    <Sparkline
                      values={campaign.sparkline}
                      label={`${campaign.name}: 7-day revenue trend`}
                    />
                  </div>

                  {/* Timestamps */}
                  <div className="hidden w-[5rem] shrink-0 text-right lg:block">
                    <div className="tnum text-2xs text-secondary">
                      {campaign.lastActiveLabel ?? "—"}
                    </div>
                    <div className="tnum text-2xs text-profit">
                      {paused ? "" : (campaign.runningSinceLabel ?? "")}
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <RunBreakdown
                    campaignId={campaign.id}
                    campaignName={campaign.name}
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

/** Plain right-aligned metric cell — no colour, per the current design. */
function Cell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("shrink-0 text-right", className)}>
      <span className="tnum text-xs text-foreground">{children}</span>
    </div>
  );
}

/**
 * A control inside the clickable row. Stops propagation so using it never also
 * expands the row.
 */
function ControlButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onKeyDown={(event) => event.stopPropagation()}
      className={cn(
        "inline-flex shrink-0 items-center transition-opacity",
        className
      )}
    >
      {children}
    </button>
  );
}
