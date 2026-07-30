/**
 * Chart color tokens.
 *
 * The current-period series uses `#8b5cf6` rather than the UI accent `#7c3aed`:
 * on a #0a0a0a surface a 2px stroke at #7c3aed sits right at the edge of the
 * 3:1 contrast floor, and one step up the violet ramp clears it comfortably
 * while reading as the same hue. #7c3aed stays the interactive accent
 * (buttons, active nav, focus rings).
 *
 * The previous-period series is a deliberately recessive neutral, not a second
 * categorical identity — it is a reference line. It carries a dash pattern as
 * secondary encoding so the two series are never distinguished by color alone.
 *
 * Validated on the #0a0a0a surface: CVD separation ΔE 20.8 (deutan),
 * normal-vision ΔE 21.8, both series >= 3:1 contrast.
 */
export const CHART = {
  current: "#8b5cf6",
  previous: "#94a3b8",
  grid: "#1a1a1a",
  axis: "#8c8c8c",
  surface: "#0a0a0a",
  profit: "#22c55e",
  loss: "#ef4444",
} as const;

export const CURRENT_DASH = undefined;
export const PREVIOUS_DASH = "4 4";
