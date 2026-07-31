/**
 * Per-row mini chart. Hand-drawn SVG rather than Recharts: one
 * <ResponsiveContainer> per table row would mount a resize observer for every
 * creative on the page.
 *
 * Draws one or two series on a shared scale, with an optional wash under the
 * first. No axes, labels, or background.
 */
export type MiniSeries = {
  values: number[];
  color: string;
  /** Fill under the line, for the primary series only. */
  fill?: boolean;
  dashed?: boolean;
};

export function MiniTrend({
  id,
  series,
  width = 120,
  height = 32,
  label,
}: {
  /**
   * Unique per instance — SVG gradient ids are document-global. Supplied by the
   * caller (a row id) rather than useId, because this renders on the server
   * where hooks are unavailable.
   */
  id: string;
  series: MiniSeries[];
  width?: number;
  height?: number;
  label: string;
}) {
  const pad = 2;
  const usable = series.filter((s) => s.values.length >= 2);

  if (usable.length === 0) {
    return <span className="inline-block" style={{ width, height }} />;
  }

  // One shared scale so the two series stay comparable against each other.
  const all = usable.flatMap((s) => s.values).filter(Number.isFinite);
  const max = Math.max(...all);
  const min = Math.min(...all);
  const span = max - min;

  const pointsFor = (values: number[]) => {
    const stepX = (width - pad * 2) / (values.length - 1);
    return values.map((value, index) => {
      const x = pad + index * stepX;
      const ratio = span === 0 ? 0.5 : (value - min) / span;
      const y = height - pad - ratio * (height - pad * 2);
      return [x, y] as const;
    });
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      role="img"
      aria-label={label}
    >
      <defs>
        {usable.map((s, i) =>
          s.fill ? (
            <linearGradient
              key={i}
              id={`mt-${id}-${i}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={s.color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ) : null
        )}
      </defs>

      {usable.map((s, i) => {
        const pts = pointsFor(s.values);
        const line = pts
          .map(([x, y], index) => `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
          .join(" ");

        return (
          <g key={i}>
            {s.fill && (
              <path
                d={`${line} L${pts[pts.length - 1][0].toFixed(2)},${height - pad} L${pts[0][0].toFixed(2)},${height - pad} Z`}
                fill={`url(#mt-${id}-${i})`}
              />
            )}
            <path
              d={line}
              stroke={s.color}
              strokeWidth="1"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={s.dashed ? "3 3" : undefined}
            />
          </g>
        );
      })}
    </svg>
  );
}
