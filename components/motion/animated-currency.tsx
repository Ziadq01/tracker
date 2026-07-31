"use client";

import * as React from "react";

import { formatCurrency } from "@/lib/metrics";

const DURATION = 400;

/** ease-out cubic — fast start, settles gently on the final figure. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Counts from the previous value to the new one over 400ms.
 *
 * Deliberately does nothing on first mount: the spec is "when it changes", and
 * a count-up racing the page fade on load reads as noise. Formatting still goes
 * through lib/metrics so the displayed figure matches everywhere else.
 */
export function AnimatedCurrency({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [display, setDisplay] = React.useState(value);
  const fromRef = React.useRef(value);
  const frameRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;

    // Respect the same preference the CSS honours.
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }

    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      setDisplay(from + (value - from) * easeOut(t));

      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
        frameRef.current = null;
      }
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      // Land on the target so an interrupted run never leaves a stale figure.
      fromRef.current = value;
    };
  }, [value]);

  return <span className={className}>{formatCurrency(display)}</span>;
}
