/**
 * Presentation-only colour rules.
 *
 * These live outside lib/metrics.ts on purpose: metrics.ts computes numbers,
 * this file decides what colour they wear. Changing a threshold here can never
 * change a calculation.
 *
 * A null value means "unknown" (a ratio whose denominator was zero), and
 * unknown is never painted green or red — it stays neutral.
 */
export type Tone = "profit" | "loss" | "neutral";

/** Threshold at which a per-click number flips from red to green. */
export const CLICK_VALUE_THRESHOLD = 0.5;

/** Spend is always red — it is a cost, regardless of size. */
export const spendTone = (): Tone => "loss";

/** Revenue is always green. */
export const revenueTone = (): Tone => "profit";

/** Profit: green when positive, red when negative. */
export function profitTone(value: number | null): Tone {
  if (value === null || !Number.isFinite(value)) return "neutral";
  return value >= 0 ? "profit" : "loss";
}

/** ROAS: green at or above break-even (1x), red below. */
export function roasTone(value: number | null): Tone {
  if (value === null || !Number.isFinite(value)) return "neutral";
  return value >= 1 ? "profit" : "loss";
}

/** EPC: green above $0.50, red at or below. */
export function epcTone(value: number | null): Tone {
  if (value === null || !Number.isFinite(value)) return "neutral";
  return value > CLICK_VALUE_THRESHOLD ? "profit" : "loss";
}

/** Network CPA: green below $0.50, red at or above — cheaper is better. */
export function netCpaTone(value: number | null): Tone {
  if (value === null || !Number.isFinite(value)) return "neutral";
  return value < CLICK_VALUE_THRESHOLD ? "profit" : "loss";
}
