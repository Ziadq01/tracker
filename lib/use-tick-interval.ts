/**
 * Returns a Set of 3 visible labels (first, middle, last) and a custom
 * Recharts tick renderer that hides every other label.
 */
export function useThreeTicks(points: { label: string }[]) {
  const visible = new Set<string>();
  if (points.length <= 3) {
    points.forEach((p) => visible.add(p.label));
  } else {
    const mid = Math.floor((points.length - 1) / 2);
    visible.add(points[0].label);
    visible.add(points[mid].label);
    visible.add(points[points.length - 1].label);
  }
  return visible;
}

export function ThreeTick({
  x,
  y,
  payload,
  visibleLabels,
  fill,
  fontSize,
  tickMargin,
}: {
  x: number;
  y: number;
  payload: { value: string };
  visibleLabels: Set<string>;
  fill: string;
  fontSize: number;
  tickMargin: number;
}) {
  if (!visibleLabels.has(payload.value)) return null;
  return (
    <text
      x={x}
      y={y + tickMargin}
      textAnchor="middle"
      fill={fill}
      fontSize={fontSize}
    >
      {payload.value}
    </text>
  );
}
