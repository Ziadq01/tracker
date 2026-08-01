import { useCallback, useState } from "react";

/**
 * Returns a ref callback and the computed Recharts `interval` value.
 * Measures container width and picks the right number of ticks:
 *   mobile  (<640px): max 5 labels
 *   desktop (≥640px): max 7 labels
 */
export function useTickInterval(pointCount: number) {
  const [interval, setInterval_] = useState(() => fallback(pointCount));

  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || pointCount <= 1) {
        setInterval_(0);
        return;
      }
      const w = node.getBoundingClientRect().width;
      const maxTicks = w < 640 ? 5 : 7;
      setInterval_(Math.max(0, Math.ceil(pointCount / maxTicks) - 1));
    },
    [pointCount],
  );

  return { containerRef, tickInterval: interval } as const;
}

function fallback(n: number) {
  return Math.max(0, Math.ceil(n / 5) - 1);
}
