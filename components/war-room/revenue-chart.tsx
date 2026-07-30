"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART, PREVIOUS_DASH } from "@/lib/chart-theme";
import { formatCurrency, percentChange, formatDelta } from "@/lib/metrics";
import type { SeriesPoint } from "@/lib/series";
import { cn } from "@/lib/utils";

type Props = {
  points: SeriesPoint[];
  currentLabel: string;
  previousLabel: string;
  bucketDescription: string;
};

/* -------------------------------------------------------------------------- */
/*  Tooltip                                                                   */
/* -------------------------------------------------------------------------- */

type TooltipProps = {
  active?: boolean;
  payload?: { payload: SeriesPoint }[];
  currentLabel: string;
  previousLabel: string;
};

function ChartTooltip({
  active,
  payload,
  currentLabel,
  previousLabel,
}: TooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const delta = percentChange(point.current, point.previous);

  return (
    <div className="min-w-[11rem] rounded-lg border border-border bg-popover/95 p-2.5 shadow-xl shadow-black/60 backdrop-blur">
      <div className="mb-2 text-2xs uppercase tracking-wider text-muted-foreground">
        {point.label}
      </div>

      <div className="space-y-1.5">
        <Row
          color={CHART.current}
          label={currentLabel}
          value={formatCurrency(point.current)}
        />
        <Row
          color={CHART.previous}
          label={previousLabel}
          value={formatCurrency(point.previous)}
          dashed
        />
      </div>

      {delta !== null && (
        <div className="mt-2 flex items-center justify-between border-t border-border pt-1.5">
          <span className="text-2xs text-muted-foreground">Change</span>
          <span
            className={cn(
              "tnum text-xs font-medium",
              delta > 0 ? "text-profit" : delta < 0 ? "text-loss" : "text-muted-foreground"
            )}
          >
            {formatDelta(delta)}
          </span>
        </div>
      )}
    </div>
  );
}

function Row({
  color,
  label,
  value,
  dashed = false,
}: {
  color: string;
  label: string;
  value: string;
  dashed?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
        <Swatch color={color} dashed={dashed} />
        {label}
      </span>
      <span className="tnum text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}

function Swatch({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block h-0.5 w-3 shrink-0 rounded-full"
      style={
        dashed
          ? {
              backgroundImage: `repeating-linear-gradient(to right, ${color} 0 3px, transparent 3px 6px)`,
            }
          : { backgroundColor: color }
      }
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Chart                                                                     */
/* -------------------------------------------------------------------------- */

export function RevenueChart({
  points,
  currentLabel,
  previousLabel,
  bucketDescription,
}: Props) {
  const hasData = points.some(
    (p) => (p.current ?? 0) !== 0 || (p.previous ?? 0) !== 0
  );

  // Keep the x-axis readable regardless of bucket count.
  const tickInterval = Math.max(0, Math.ceil(points.length / 12) - 1);

  return (
    <div className="flex flex-col">
      {/* Legend — identity is never carried by color alone. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pb-3">
        <LegendItem color={CHART.current} label={currentLabel} />
        <LegendItem color={CHART.previous} label={previousLabel} dashed />
        <span className="ml-auto text-2xs text-muted-foreground">
          {bucketDescription}
        </span>
      </div>

      <div className="h-[16rem] w-full sm:h-[18rem]">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              // Right margin keeps the final x-axis label from being clipped.
              margin={{ top: 4, right: 20, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                stroke={CHART.grid}
                strokeDasharray="0"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                interval={tickInterval}
                tick={{ fill: CHART.axis, fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: CHART.grid }}
                tickMargin={8}
                minTickGap={4}
              />
              <YAxis
                width={56}
                tick={{ fill: CHART.axis, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  formatCurrency(v, { decimals: 0, compact: true })
                }
              />
              <Tooltip
                cursor={{ stroke: CHART.axis, strokeWidth: 1, strokeDasharray: "3 3" }}
                content={
                  <ChartTooltip
                    currentLabel={currentLabel}
                    previousLabel={previousLabel}
                  />
                }
              />

              {/* Previous first so the current period draws on top. */}
              <Line
                type="monotone"
                dataKey="previous"
                name={previousLabel}
                stroke={CHART.previous}
                strokeWidth={2}
                strokeDasharray={PREVIOUS_DASH}
                dot={false}
                activeDot={{ r: 3.5, strokeWidth: 0 }}
                isAnimationActive={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="current"
                name={currentLabel}
                stroke={CHART.current}
                strokeWidth={2}
                dot={false}
                activeDot={{
                  r: 4,
                  strokeWidth: 2,
                  stroke: CHART.surface,
                  fill: CHART.current,
                }}
                isAnimationActive={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border">
            <p className="text-xs text-muted-foreground">
              No revenue recorded in this window.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function LegendItem({
  color,
  label,
  dashed = false,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 text-2xs text-muted-foreground">
      <Swatch color={color} dashed={dashed} />
      {label}
    </span>
  );
}
