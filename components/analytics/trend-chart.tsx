"use client";

import * as React from "react";
import {
  Area,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART } from "@/lib/chart-theme";
import type { DualPoint } from "@/lib/dual-series";
import { formatCurrency, formatNumber } from "@/lib/metrics";

type Props = {
  points: DualPoint[];
  /** Unique per instance — SVG gradient ids are document-global. */
  gradientId: string;
  height?: number;
};

/* -------------------------------------------------------------------------- */
/*  Tooltip                                                                   */
/* -------------------------------------------------------------------------- */

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DualPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="min-w-[10rem] border border-border bg-background p-2.5">
      <div className="mb-2 text-2xs uppercase tracking-header text-secondary">
        {point.label}
      </div>
      <Row
        color={CHART.line}
        label="Revenue"
        value={formatCurrency(point.revenue)}
      />
      <Row
        color={CHART.clicks}
        label="Network Clicks"
        value={formatNumber(point.clicks)}
      />
    </div>
  );
}

function Row({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-0.5">
      <span className="flex items-center gap-2 text-2xs text-secondary">
        <Swatch color={color} />
        {label}
      </span>
      <span className="tnum text-xs text-foreground">{value}</span>
    </div>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-px w-3 shrink-0"
      style={{ backgroundColor: color }}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Chart                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Revenue and network clicks over the selected window.
 *
 * Both series share ONE y-axis. They carry different units, so this is a
 * shape-vs-shape comparison, not a value-vs-value one — but a second y-axis
 * would be worse: two independent scales can make any two series appear to
 * track each other. If the two magnitudes ever diverge enough that one line
 * flattens against the axis, the fix is two charts, not a second scale.
 */
export function TrendChart({ points, gradientId, height = 260 }: Props) {
  const hasData = points.some(
    (p) => (p.revenue ?? 0) !== 0 || (p.clicks ?? 0) !== 0
  );

  if (!hasData) {
    return (
      <div
        className="flex items-center justify-center border-t border-border"
        style={{ height }}
      >
        <p className="text-xs text-secondary">No data in this window.</p>
      </div>
    );
  }

  // Replays the wipe whenever the plotted data changes, not just on mount.
  const drawKey = `${points.length}:${points[0]?.label ?? ""}:${points[points.length - 1]?.label ?? ""}`;

  return (
    <div className="w-full">
      <div key={drawKey} className="animate-draw" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={points}
            // No tick labels hang off the right edge any more, so the gutter
            // that kept the last one from clipping is gone.
            margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id={`${gradientId}-rev`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.line} stopOpacity={0.08} />
                <stop offset="100%" stopColor={CHART.line} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`${gradientId}-clicks`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART.clicks} stopOpacity={0.08} />
                <stop offset="100%" stopColor={CHART.clicks} stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Y-axis numbers are the only chrome: no grid lines, no axis
                rules, and no date labels along the bottom. The x-axis is
                declared but hidden — it still supplies the category scale the
                tooltip reads, it just draws nothing. Dates live in the
                tooltip. */}
            <YAxis
              width={56}
              tick={{ fill: CHART.axis, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => compact(value)}
            />
            <XAxis dataKey="label" hide />
            <Tooltip
              cursor={{ stroke: CHART.axis, strokeWidth: 1 }}
              content={<ChartTooltip />}
            />

            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke={CHART.line}
              strokeWidth={1.5}
              fill={`url(#${gradientId}-rev)`}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Area
              type="monotone"
              dataKey="clicks"
              name="Network Clicks"
              stroke={CHART.clicks}
              strokeWidth={1.5}
              fill={`url(#${gradientId}-clicks)`}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Axis ticks are unitless — the two series share this scale. */
function compact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString("en-US");
}
