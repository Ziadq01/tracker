"use client";

import * as React from "react";
import {
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
import { useThreeTicks, ThreeTick } from "@/lib/use-tick-interval";
import { cn } from "@/lib/utils";

type Props = {
  points: SeriesPoint[];
  /**
   * Still required even though no legend is rendered: the two series are
   * identified in the hover tooltip instead, so identity is never carried by
   * colour alone (the previous period is dashed as well).
   */
  currentLabel: string;
  previousLabel: string;
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
    <div className="min-w-[11rem] border border-border bg-background p-2.5">
      <div className="mb-2 text-2xs uppercase tracking-header text-secondary">
        {point.label}
      </div>

      <Row
        color={CHART.line}
        label={currentLabel}
        value={formatCurrency(point.current)}
      />
      <Row
        color={CHART.previous}
        label={previousLabel}
        value={formatCurrency(point.previous)}
        dashed
      />

      {delta !== null && (
        <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
          <span className="text-2xs text-secondary">Change</span>
          <span
            className={cn(
              "tnum text-xs",
              delta > 0
                ? "text-profit"
                : delta < 0
                  ? "text-loss"
                  : "text-secondary"
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
    <div className="flex items-center justify-between gap-6 py-0.5">
      <span className="flex items-center gap-2 text-2xs text-secondary">
        <Swatch color={color} dashed={dashed} />
        {label}
      </span>
      <span className="tnum text-xs text-foreground">{value}</span>
    </div>
  );
}

function Swatch({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <span
      aria-hidden
      className="inline-block h-px w-3 shrink-0"
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

export function RevenueChart({ points, currentLabel, previousLabel }: Props) {
  const hasData = points.some(
    (p) => (p.current ?? 0) !== 0 || (p.previous ?? 0) !== 0
  );

  const visibleLabels = useThreeTicks(points);

  return (
    <div className="flex flex-col">
      <div className="h-[17rem] w-full sm:h-[19rem]">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              // With the y-axis hidden there is no gutter, so the first and
              // last tick labels need margin of their own or they clip.
              margin={{ top: 4, right: 28, bottom: 0, left: 28 }}
            >
              {/* No grid, no fill, no y-axis. The y-scale still has to exist
                  for Recharts to place the line, so it is rendered hidden
                  rather than omitted. */}
              <YAxis hide domain={["dataMin", "dataMax"]} />
              <XAxis
                dataKey="label"
                tick={(props: Record<string, unknown>) => (
                  <ThreeTick
                    {...(props as { x: number; y: number; payload: { value: string } })}
                    visibleLabels={visibleLabels}
                    fill={CHART.axis}
                    fontSize={11}
                    tickMargin={10}
                  />
                )}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
              />
              <Tooltip
                cursor={{ stroke: CHART.axis, strokeWidth: 1 }}
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
                strokeWidth={1}
                strokeDasharray={PREVIOUS_DASH}
                dot={false}
                activeDot={{ r: 2.5, strokeWidth: 0 }}
                isAnimationActive={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="current"
                name={currentLabel}
                stroke={CHART.line}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0, fill: CHART.line }}
                isAnimationActive={false}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center border-t border-border">
            <p className="text-xs text-secondary">
              No revenue recorded in this window.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
