/**
 * Returns the Recharts `ticks` array: first, middle, last label only.
 */
export function useThreeTicks(points: { label: string }[]) {
  if (points.length <= 3) return points.map((p) => p.label);
  const mid = Math.floor((points.length - 1) / 2);
  return [points[0].label, points[mid].label, points[points.length - 1].label];
}
