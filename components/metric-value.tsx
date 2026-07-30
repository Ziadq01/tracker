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

/** Dot + label. No pill, no background. */
export function StatusBadge({ status }: { status: string | null }) {
  const paused = status === "paused";
  const known = status === "active" || paused;

  if (!known) {
    return <span className="text-xs text-secondary">—</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs",
        paused ? "text-secondary" : "text-profit"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          paused ? "bg-secondary" : "bg-profit"
        )}
      />
      {paused ? "Paused" : "Active"}
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
