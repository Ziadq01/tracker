import type { SeriesPoint } from "@/lib/series";

/**
 * Zips two single-metric series into one dataset for a two-line chart.
 *
 * Both are built by the existing `buildComparisonSeries`, so bucketing is
 * unchanged — this only takes each one's current-period values and pairs them
 * by bucket index. The previous-period values are dropped; the chart no longer
 * draws a comparison line.
 */
export type DualPoint = {
  label: string;
  revenue: number | null;
  clicks: number | null;
};

export function zipSeries(
  revenue: SeriesPoint[],
  clicks: SeriesPoint[]
): DualPoint[] {
  const length = Math.max(revenue.length, clicks.length);
  const points: DualPoint[] = [];

  for (let i = 0; i < length; i += 1) {
    points.push({
      label: revenue[i]?.label ?? clicks[i]?.label ?? "",
      revenue: revenue[i]?.current ?? null,
      clicks: clicks[i]?.current ?? null,
    });
  }

  return points;
}
