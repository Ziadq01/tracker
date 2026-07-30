import { Badge } from "@/components/ui/badge";
import { type Tone } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const TONE_TEXT: Record<Tone, string> = {
  profit: "text-profit",
  loss: "text-loss",
  neutral: "text-foreground",
};

/** A right-aligned, tabular-figure numeric cell. */
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
        "tnum tabular-nums",
        muted ? "text-muted-foreground" : TONE_TEXT[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string | null }) {
  if (status === "paused") {
    return <Badge variant="muted">Paused</Badge>;
  }
  if (status === "active") {
    return <Badge variant="profit">Active</Badge>;
  }
  return <Badge variant="outline">—</Badge>;
}

export function TypeBadge({ type }: { type: string | null }) {
  if (!type) return <Badge variant="outline">—</Badge>;
  return (
    <Badge variant={type === "owned" ? "default" : "secondary"}>
      {type === "owned" ? "Owned" : "Rented"}
    </Badge>
  );
}
