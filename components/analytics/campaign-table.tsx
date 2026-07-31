"use client";

import * as React from "react";

import { RunBreakdown } from "@/components/analytics/run-breakdown";
import { Collapsible } from "@/components/motion/collapsible";
import { StatusBadge } from "@/components/metric-value";
import { setCampaignStatus } from "@/lib/actions";
import { sortCampaignViews, type CampaignView } from "@/lib/campaign-ui";
import {
  deriveMetrics,
  formatCurrency,
  formatNumber,
  formatRatio,
} from "@/lib/metrics";
import { profitTone, roasTone, type Tone } from "@/lib/tone-rules";
import { cn } from "@/lib/utils";

type Props = {
  campaigns: CampaignView[];
};

/** Metric columns, in order. TT = TikTok clicks, NET = network clicks. */
const COLUMNS = [
  "Spend",
  "Rev",
  "Profit",
  "ROAS",
  "EPC",
  "TT",
  "Net",
  "CPA",
] as const;

/* -------------------------------------------------------------------------- */
/*  Column geometry                                                           */
/*                                                                            */
/*  Header, data rows and the total row all share these so the columns line   */
/*  up inside the horizontal scroll. Widths are fixed below md and only the   */
/*  name column flexes above it.                                              */
/* -------------------------------------------------------------------------- */

/** Wide enough on mobile that every column keeps its full value. */
const INNER = "min-w-[62rem] md:min-w-0";

// pr only: the left padding lives on the sticky name cell so it travels
// with the cell instead of scrolling out from under it.
const ROW = "flex items-center gap-3 pr-3 md:gap-4";

/**
 * Sticky through the horizontal scroll so the campaign stays identifiable at
 * any offset. It needs an opaque fill or the cells beneath slide through it,
 * and that fill has to follow the row's hover state.
 */
const NAME_CELL =
  "sticky left-0 z-[1] w-[9.5rem] min-w-0 shrink-0 pl-3 md:static md:w-auto md:flex-1";

const STATUS_CELL = "w-[5rem] shrink-0 md:w-[5.5rem]";

const METRIC_CELL = "w-[4.75rem] shrink-0 md:w-[5.5rem]";

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

  /**
   * Footer totals for the whole table.
   *
   * Spend, revenue and both click counts are summed. ROAS, EPC and CPA are NOT
   * averaged across rows — they are recomputed from those sums (total revenue ÷
   * total spend, and so on), which is the same rule every other aggregate in
   * the app follows. A mean of per-campaign ratios would disagree with the
   * spend and revenue printed beside it on this very row.
   */
  const totals = React.useMemo(
    () =>
      deriveMetrics(
        merged.reduce(
          (acc, campaign) => ({
            adSpend: acc.adSpend + campaign.metrics.adSpend,
            revenue: acc.revenue + campaign.metrics.revenue,
            tiktokClicks: acc.tiktokClicks + campaign.metrics.tiktokClicks,
            networkClicks: acc.networkClicks + campaign.metrics.networkClicks,
          }),
          { adSpend: 0, revenue: 0, tiktokClicks: 0, networkClicks: 0 }
        )
      ),
    [merged]
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
      <p className="py-16 text-center text-xs text-secondary">
        No campaign activity in this window
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

      {/* Below md the whole table scrolls sideways as one piece — header,
          rows and totals together — so the columns stay aligned and nothing
          is dropped. The CAMP column is sticky inside that scroll, so the
          campaign you are reading stays on screen at any scroll offset. */}
      <div className="scroll-x">
        <div className={INNER}>
          <div
            className={cn(
              ROW,
              "border-b border-border py-2 text-2xs uppercase tracking-header text-secondary"
            )}
          >
            <div className={cn(NAME_CELL, "bg-background")}>Camp</div>
            <div className={STATUS_CELL}>Status</div>
            {COLUMNS.map((label) => (
              <div key={label} className={cn(METRIC_CELL, "text-right")}>
                {label}
              </div>
            ))}
          </div>

          <div>
            {merged.map((campaign, index) => {
              const isOpen = expanded[campaign.id] ?? false;
              const paused = campaign.status === "paused";

              return (
                <div
                  key={campaign.id}
                  className="animate-row border-b border-border"
                  // 30ms apart, capped so a long table still finishes inside
                  // the 600ms budget rather than trickling in for seconds.
                  style={
                    {
                      "--row-delay": `${Math.min(index, 16) * 30}ms`,
                    } as React.CSSProperties
                  }
                >
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
                    // Taller rows on a phone: more room for a thumb, and the
                    // group hook lets the sticky cell follow the row's hover.
                    className={cn(
                      ROW,
                      "group w-full cursor-pointer py-4 text-left transition-colors duration-100 hover:bg-hover md:py-3"
                    )}
                  >
                    {/* Name over BC account, nothing else. The last-active and
                        running stamps are gone from the row — the status pill
                        and the expanded run list already carry that. */}
                    <div
                      className={cn(
                        NAME_CELL,
                        "bg-background transition-colors duration-100 group-hover:bg-hover"
                      )}
                    >
                      <div className="truncate text-xs font-bold text-foreground md:text-[13px]">
                        {campaign.name}
                      </div>
                      <div className="truncate text-2xs text-secondary md:text-xs">
                        {campaign.bcAccountName ?? "No BC account"}
                      </div>
                    </div>

                    {/* Status pill sits immediately before Spend and stays the
                        row's only control — tapping it toggles, not expands. */}
                    <div className={STATUS_CELL}>
                      <button
                        type="button"
                        aria-label={
                          paused ? "Activate campaign" : "Pause campaign"
                        }
                        title={
                          paused
                            ? "Paused — tap to activate"
                            : "Active — tap to pause"
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleStatus(
                            campaign.id,
                            paused ? "active" : "paused"
                          );
                        }}
                        onKeyDown={(event) => event.stopPropagation()}
                        className="-my-2 inline-flex min-h-[44px] items-center md:my-0 md:min-h-0"
                      >
                        <StatusBadge status={paused ? "paused" : "active"} />
                      </button>
                    </div>

                    <Metric>{formatCurrency(campaign.metrics.adSpend)}</Metric>
                    <Metric>{formatCurrency(campaign.metrics.revenue)}</Metric>
                    <Metric
                      className={toneClass(profitTone(campaign.metrics.profit))}
                    >
                      {formatCurrency(campaign.metrics.profit)}
                    </Metric>

                    {/* ROAS keys off break-even (1x), not zero. */}
                    <Metric
                      className={toneClass(roasTone(campaign.metrics.roas))}
                    >
                      {formatRatio(campaign.metrics.roas)}
                    </Metric>

                    <Metric>{formatCurrency(campaign.metrics.epc)}</Metric>

                    <Metric>
                      {formatNumber(campaign.metrics.tiktokClicks)}
                    </Metric>
                    <Metric>
                      {formatNumber(campaign.metrics.networkClicks)}
                    </Metric>
                    <Metric>
                      {formatCurrency(campaign.metrics.networkCpa)}
                    </Metric>
                  </div>

                  <Collapsible open={isOpen}>
                    <RunBreakdown
                      campaignId={campaign.id}
                      runs={campaign.runs}
                    />
                  </Collapsible>
                </div>
              );
            })}
          </div>

          {/* Totals. 2px rule, bold text, no fill. Sits inside the same scroll
              container, so it stays at the bottom and tracks the columns. */}
          <div
            className={cn(
              ROW,
              "border-t-2 border-border py-3 text-xs font-bold text-foreground md:text-[13px]"
            )}
          >
            <div className={cn(NAME_CELL, "bg-background")}>Total</div>
            <div className={STATUS_CELL} />

            <TotalCell>{formatCurrency(totals.adSpend)}</TotalCell>
            <TotalCell>{formatCurrency(totals.revenue)}</TotalCell>
            <TotalCell className={toneClass(profitTone(totals.profit))}>
              {formatCurrency(totals.profit)}
            </TotalCell>
            <TotalCell className={toneClass(roasTone(totals.roas))}>
              {formatRatio(totals.roas)}
            </TotalCell>
            <TotalCell>{formatCurrency(totals.epc)}</TotalCell>
            <TotalCell>{formatNumber(totals.tiktokClicks)}</TotalCell>
            <TotalCell>{formatNumber(totals.networkClicks)}</TotalCell>
            <TotalCell>{formatCurrency(totals.networkCpa)}</TotalCell>
          </div>
        </div>
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
    <div className={cn(METRIC_CELL, "text-right")}>
      <span
        className={cn(
          "tnum text-xs md:text-[13px]",
          className ?? "text-foreground"
        )}
      >
        {children}
      </span>
    </div>
  );
}

/** Same geometry as `Metric`; weight and colour come from the total row. */
function TotalCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(METRIC_CELL, "text-right")}>
      <span className={cn("tnum", className)}>{children}</span>
    </div>
  );
}
