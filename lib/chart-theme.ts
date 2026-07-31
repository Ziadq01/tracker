/**
 * Chart tokens. These read the CSS variables at render time so the chart
 * follows the light/dark toggle without re-mounting.
 *
 * Strokes are graphics, not text, so the 3:1 contrast threshold applies rather
 * than the 4.5:1 text needs. The values themselves live in app/globals.css.
 */
export const CHART = {
  line: "var(--chart-line)",
  clicks: "var(--chart-clicks)",
  previous: "var(--chart-previous)",
  axis: "var(--chart-axis)",
} as const;

/** Previous period is dashed, so the two series never rely on colour alone. */
export const PREVIOUS_DASH = "3 3";
