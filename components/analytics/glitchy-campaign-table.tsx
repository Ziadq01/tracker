"use client";

import * as React from "react";

import { StatusBadge } from "@/components/metric-value";
import type { GlitchyCampaign } from "@/app/api/glitchy/sync/route";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  safeDivide,
} from "@/lib/metrics";
import { cn } from "@/lib/utils";

type Props = {
  campaigns: GlitchyCampaign[];
  selectedSource?: string | null;
  onSelectCampaign?: (source: string) => void;
};

const COLUMNS = [
  "Status",
  "Spend",
  "Rev",
  "CVR",
  "Convs",
  "Profit",
  "ROAS",
  "EPC",
  "TT",
  "Net",
  "CPA",
] as const;

const MOBILE_COLUMNS = ["Rev", "Clicks", "EPC", "Convs", "CVR"] as const;

const INNER = "min-w-[67rem] md:min-w-0";
const MOBILE_INNER = "min-w-[28rem]";
const ROW = "flex items-center gap-3 pr-3 md:gap-4";
const MOBILE_ROW = "flex items-center gap-2 pr-3";
const NAME_CELL =
  "sticky left-0 z-[1] w-[9.5rem] min-w-0 shrink-0 pl-3 md:static md:w-auto md:flex-1";
const MOBILE_NAME_CELL =
  "sticky left-0 z-[1] w-[7rem] min-w-0 shrink-0 pl-3";
const STATUS_CELL = "w-[5rem] shrink-0 md:w-[5.5rem]";
const METRIC_CELL = "w-[4.75rem] shrink-0 md:w-[5.5rem]";
const MOBILE_METRIC_CELL = "w-[3.75rem] shrink-0";

const DASH = "—";

export function GlitchyCampaignTable({
  campaigns,
  selectedSource = null,
  onSelectCampaign,
}: Props) {
  if (campaigns.length === 0) {
    return (
      <p className="py-16 text-center text-xs text-secondary">
        No campaign activity in this window
      </p>
    );
  }

  const totals = campaigns.reduce(
    (acc, c) => ({
      revenue: acc.revenue + c.revenue,
      conversions: acc.conversions + c.conversions,
      clicks: acc.clicks + c.clicks,
    }),
    { revenue: 0, conversions: 0, clicks: 0 }
  );
  const totalEpc = safeDivide(totals.revenue, totals.clicks);
  const totalCvr = safeDivide(totals.conversions, totals.clicks);

  return (
    <section>
      {/* ── Mobile table (SOURCE · REV · CLICKS · EPC · CONVS · CVR) ── */}
      <div className="md:hidden">
        <div className="scroll-x">
          <div className={MOBILE_INNER}>
            {/* Header */}
            <div
              className={cn(
                MOBILE_ROW,
                "border-b border-border py-2 text-2xs uppercase tracking-header text-secondary"
              )}
            >
              <div className={cn(MOBILE_NAME_CELL, "bg-background")}>Source</div>
              {MOBILE_COLUMNS.map((label) => (
                <div key={label} className={cn(MOBILE_METRIC_CELL, "text-right")}>
                  {label}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div>
              {campaigns.map((campaign, index) => {
                const isSelected = campaign.source === selectedSource;

                return (
                  <div
                    key={campaign.source}
                    className="animate-row border-b border-border"
                    style={
                      {
                        "--row-delay": `${Math.min(index, 16) * 30}ms`,
                      } as React.CSSProperties
                    }
                  >
                    <div
                      className={cn(
                        MOBILE_ROW,
                        "group w-full py-3 text-left transition-colors duration-100",
                        isSelected && "bg-hover"
                      )}
                    >
                      <div
                        className={cn(
                          MOBILE_NAME_CELL,
                          "bg-background transition-colors duration-100 group-hover:bg-hover",
                          isSelected && "bg-hover"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectCampaign?.(campaign.source)}
                          aria-pressed={isSelected}
                          className={cn(
                            "block max-w-full truncate text-left text-xs font-bold text-foreground underline-offset-4",
                            isSelected && "underline"
                          )}
                        >
                          {campaign.source}
                        </button>
                      </div>

                      <MobileMetric>{formatCurrency(campaign.revenue)}</MobileMetric>
                      <MobileMetric>{formatNumber(campaign.clicks)}</MobileMetric>
                      <MobileMetric>
                        {campaign.epc !== null ? formatCurrency(campaign.epc) : DASH}
                      </MobileMetric>
                      <MobileMetric>{formatNumber(campaign.conversions)}</MobileMetric>
                      <MobileMetric>
                        {campaign.cvr !== null ? formatPercent(campaign.cvr) : DASH}
                      </MobileMetric>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div
              className={cn(
                MOBILE_ROW,
                "border-t-2 border-border py-3 text-xs font-bold text-foreground"
              )}
            >
              <div className={cn(MOBILE_NAME_CELL, "bg-background")}>Total</div>
              <MobileTotal>{formatCurrency(totals.revenue)}</MobileTotal>
              <MobileTotal>{formatNumber(totals.clicks)}</MobileTotal>
              <MobileTotal>
                {totalEpc !== null ? formatCurrency(totalEpc) : DASH}
              </MobileTotal>
              <MobileTotal>{formatNumber(totals.conversions)}</MobileTotal>
              <MobileTotal>
                {totalCvr !== null ? formatPercent(totalCvr * 100) : DASH}
              </MobileTotal>
            </div>
          </div>
        </div>
      </div>

      {/* ── Desktop table (unchanged) ── */}
      <div className="hidden md:block">
        <div className="scroll-x">
          <div className={INNER}>
            <div
              className={cn(
                ROW,
                "border-b border-border py-2 text-2xs uppercase tracking-header text-secondary"
              )}
            >
              <div className={cn(NAME_CELL, "bg-background")}>Source</div>
              {COLUMNS.map((label) => (
                <div key={label} className={cn(
                  label === "Status" ? STATUS_CELL : METRIC_CELL,
                  label !== "Status" && "text-right"
                )}>
                  {label}
                </div>
              ))}
            </div>

            <div>
              {campaigns.map((campaign, index) => {
                const isSelected = campaign.source === selectedSource;
                const isActive = campaign.clicks > 0;

                return (
                  <div
                    key={campaign.source}
                    className="animate-row border-b border-border"
                    style={
                      {
                        "--row-delay": `${Math.min(index, 16) * 30}ms`,
                      } as React.CSSProperties
                    }
                  >
                    <div
                      className={cn(
                        ROW,
                        "group w-full py-4 text-left transition-colors duration-100 hover:bg-hover md:py-3",
                        isSelected && "bg-hover"
                      )}
                    >
                      <div
                        className={cn(
                          NAME_CELL,
                          "bg-background transition-colors duration-100 group-hover:bg-hover",
                          isSelected && "bg-hover"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => onSelectCampaign?.(campaign.source)}
                          aria-pressed={isSelected}
                          title={
                            isSelected
                              ? "Charting this campaign — tap to show all"
                              : "Chart this campaign only"
                          }
                          className={cn(
                            "block max-w-full truncate text-left text-xs font-bold text-foreground underline-offset-4 transition-colors hover:underline md:text-[13px]",
                            isSelected && "underline"
                          )}
                        >
                          {campaign.source}
                        </button>
                      </div>

                      <div className={STATUS_CELL}>
                        <StatusBadge status={isActive ? "active" : "paused"} />
                      </div>

                      <Metric>{DASH}</Metric>
                      <Metric>{formatCurrency(campaign.revenue)}</Metric>
                      <Metric>
                        {campaign.cvr !== null
                          ? formatPercent(campaign.cvr)
                          : DASH}
                      </Metric>
                      <Metric>{formatNumber(campaign.conversions)}</Metric>
                      <Metric>{DASH}</Metric>
                      <Metric>{DASH}</Metric>
                      <Metric>
                        {campaign.epc !== null
                          ? formatCurrency(campaign.epc)
                          : DASH}
                      </Metric>
                      <Metric>{formatNumber(campaign.clicks)}</Metric>
                      <Metric>{formatNumber(campaign.clicks)}</Metric>
                      <Metric>{DASH}</Metric>
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              className={cn(
                ROW,
                "border-t-2 border-border py-3 text-xs font-bold text-foreground md:text-[13px]"
              )}
            >
              <div className={cn(NAME_CELL, "bg-background")}>Total</div>
              <div className={STATUS_CELL} />
              <TotalCell>{DASH}</TotalCell>
              <TotalCell>{formatCurrency(totals.revenue)}</TotalCell>
              <TotalCell>
                {totalCvr !== null ? formatPercent(totalCvr * 100) : DASH}
              </TotalCell>
              <TotalCell>{formatNumber(totals.conversions)}</TotalCell>
              <TotalCell>{DASH}</TotalCell>
              <TotalCell>{DASH}</TotalCell>
              <TotalCell>
                {totalEpc !== null ? formatCurrency(totalEpc) : DASH}
              </TotalCell>
              <TotalCell>{formatNumber(totals.clicks)}</TotalCell>
              <TotalCell>{formatNumber(totals.clicks)}</TotalCell>
              <TotalCell>{DASH}</TotalCell>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Helpers ── */

function MobileMetric({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(MOBILE_METRIC_CELL, "text-right")}>
      <span className="tnum text-xs text-foreground">{children}</span>
    </div>
  );
}

function MobileTotal({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(MOBILE_METRIC_CELL, "text-right")}>
      <span className="tnum">{children}</span>
    </div>
  );
}

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
