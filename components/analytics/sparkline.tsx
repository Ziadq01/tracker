/**
 * 40px trailing-7-day revenue sparkline. No axes, labels, or background —
 * it reads as a texture in the row, not as a chart.
 *
 * Hand-drawn SVG rather than Recharts: one <ResponsiveContainer> per table row
 * would mount dozens of resize observers for a 40×16 graphic.
 */
export function Sparkline({
  values,
  label,
}: {
  values: number[];
  label?: string;
}) {
  const width = 40;
  const height = 16;
  const pad = 1;

  const points = values.filter((v) => Number.isFinite(v));
  if (points.length < 2) {
    return <span className="inline-block" style={{ width, height }} />;
  }

  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min;

  const stepX = (width - pad * 2) / (points.length - 1);

  const path = points
    .map((value, index) => {
      const x = pad + index * stepX;
      // Flat series sit on the centre line rather than dividing by zero.
      const ratio = span === 0 ? 0.5 : (value - min) / span;
      const y = height - pad - ratio * (height - pad * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      role="img"
      aria-label={label ?? "7-day revenue trend"}
      className="overflow-visible"
    >
      <path
        d={path}
        stroke="var(--chart-line)"
        strokeWidth="1"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
