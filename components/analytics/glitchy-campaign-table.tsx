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

const INNER = "min-w-[67rem] md:min-w-0";
const ROW = "flex items-center gap-3 pr-3 md:gap-4";
const NAME_CELL =
  "sticky left-0 z-[1] w-[9.5rem] min-w-0 shrink-0 pl-3 md:static md:w-auto md:flex-1";
const STATUS_CELL = "w-[5rem] shrink-0 md:w-[5.5rem]";
const METRIC_CELL = "w-[4.75rem] shrink-0 md:w-[5.5rem]";

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
      {/* ── Mobile card feed ── */}
      <div className="flex flex-col gap-3 md:hidden">
        {campaigns.map((campaign, index) => {
          const isActive = campaign.clicks > 0;
          const isSelected = campaign.source === selectedSource;

          return (
            <div
              key={campaign.source}
              className={cn(
                "animate-row rounded-lg border border-border bg-background p-4",
                isSelected && "border-foreground"
              )}
              style={
                {
                  "--row-delay": `${Math.min(index, 16) * 30}ms`,
                } as React.CSSProperties
              }
            >
              {/* Top row: source + status */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onSelectCampaign?.(campaign.source)}
                  aria-pressed={isSelected}
                  className={cn(
                    "truncate text-xs font-bold text-foreground",
                    isSelected && "underline underline-offset-4"
                  )}
                >
                  {campaign.source}
                </button>
                <StatusBadge status={isActive ? "active" : "paused"} />
              </div>

              {/* Divider */}
              <div className="my-3 border-t border-border" />

              {/* Stats grid: 3 cols × 2 rows */}
              <div className="grid grid-cols-3 gap-x-4 gap-y-3">
                <StatCell label="REV" value={formatCurrency(campaign.revenue)} />
                <StatCell label="CLICKS" value={formatNumber(campaign.clicks)} />
                <StatCell
                  label="EPC"
                  value={
                    campaign.epc !== null
                      ? formatCurrency(campaign.epc)
                      : DASH
                  }
                />
                <StatCell
                  label="CONVS"
                  value={formatNumber(campaign.conversions)}
                />
                <StatCell
                  label="CVR"
                  value={
                    campaign.cvr !== null ? formatPercent(campaign.cvr) : DASH
                  }
                />
              </div>
            </div>
          );
        })}

        {/* Totals card */}
        <div className="rounded-lg border-2 border-border bg-background p-4">
          <p className="text-xs font-bold text-foreground">Total</p>
          <div className="my-3 border-t border-border" />
          <div className="grid grid-cols-3 gap-x-4 gap-y-3">
            <StatCell label="REV" value={formatCurrency(totals.revenue)} bold />
            <StatCell label="CLICKS" value={formatNumber(totals.clicks)} bold />
            <StatCell
              label="EPC"
              value={totalEpc !== null ? formatCurrency(totalEpc) : DASH}
              bold
            />
            <StatCell
              label="CONVS"
              value={formatNumber(totals.conversions)}
              bold
            />
            <StatCell
              label="CVR"
              value={totalCvr !== null ? formatPercent(totalCvr * 100) : DASH}
              bold
            />
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

function StatCell({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div>
      <p className="text-2xs uppercase tracking-header text-secondary">
        {label}
      </p>
      <p
        className={cn(
          "tnum mt-0.5 text-xs text-foreground",
          bold && "font-bold"
        )}
      >
        {value}
      </p>
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
