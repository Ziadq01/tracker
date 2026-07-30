import { cn } from "@/lib/utils";

/**
 * Spend pace against the window's budget allowance. Gray track, green fill,
 * red past 90%.
 *
 * A null pace means no daily budget is set — the bar renders as an empty track
 * rather than a full or empty fill, because unknown is not zero.
 */
export function BudgetBar({
  pace,
  title,
}: {
  pace: number | null;
  title?: string;
}) {
  const known = pace !== null && Number.isFinite(pace);
  const clamped = known ? Math.max(0, Math.min(100, pace)) : 0;
  const over = known && pace >= 90;

  return (
    <div
      className="mt-1 h-[2px] w-full bg-border"
      role="img"
      aria-label={title ?? "Budget pace"}
      title={title}
    >
      {known && (
        <div
          className={cn("h-full", over ? "bg-loss" : "bg-profit")}
          style={{ width: `${clamped}%` }}
        />
      )}
    </div>
  );
}
