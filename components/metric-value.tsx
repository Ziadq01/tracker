import { type Tone } from "@/lib/tone-rules";
import { cn } from "@/lib/utils";

const TONE_TEXT: Record<Tone, string> = {
  profit: "text-profit",
  loss: "text-loss",
  neutral: "text-foreground",
};

/** Right-aligned tabular numeric cell. */
export function MetricValue({
  children,
  tone = "neutral",
  muted = false,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "tnum",
        muted ? "text-secondary" : TONE_TEXT[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Status pill: label alone on a tinted rounded background — no dot. The tint
 * plus the text colour already carry the state, and the dot was a second
 * encoding of the same thing.
 *
 * The tints are the one place rounded corners and filled backgrounds are used,
 * so a run of rows reads as a column of states at a glance.
 */
export function StatusBadge({
  status,
  active,
}: {
  /** "active" | "paused" — or pass `active` for boolean-backed rows. */
  status?: string | null;
  active?: boolean;
}) {
  const isActive =
    typeof active === "boolean" ? active : status === "active";
  const known = typeof active === "boolean" || status === "active" || status === "paused";

  if (!known) {
    return <span className="text-xs text-secondary">—</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium",
        "transition-colors duration-150 ease-out",
        isActive
          ? "bg-profit-soft text-profit-strong"
          : "bg-muted-soft text-muted-strong"
      )}
    >
      {isActive ? "Active" : "Paused"}
    </span>
  );
}

/** Owned / Rented as plain text — no pill. */
export function TypeLabel({ type }: { type: string | null }) {
  if (!type) return <span className="text-xs text-secondary">—</span>;
  return (
    <span className="text-xs text-foreground">
      {type === "owned" ? "Owned" : "Rented"}
    </span>
  );
}
