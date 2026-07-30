import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import { type Tone } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const TONE_VALUE: Record<Tone, string> = {
  profit: "text-profit",
  loss: "text-loss",
  neutral: "text-foreground",
};

const TONE_RAIL: Record<Tone, string> = {
  profit: "bg-profit",
  loss: "bg-loss",
  neutral: "bg-border",
};

const TONE_GLOW: Record<Tone, string> = {
  profit: "from-profit/[0.07]",
  loss: "from-loss/[0.07]",
  neutral: "from-transparent",
};

export type KpiCardProps = {
  label: string;
  value: string;
  tone: Tone;
  /** Period-over-period change, already computed. */
  delta?: number | null;
  /**
   * Whether a rising delta is good. Spend going up isn't a win on its own, so
   * its arrow stays neutral rather than green.
   */
  deltaPolarity?: "positive-good" | "neutral";
  /** Small line under the value giving the number its context. */
  footnote?: string;
};

export function KpiCard({
  label,
  value,
  tone,
  delta,
  deltaPolarity = "positive-good",
  footnote,
}: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden">
      {/* Left rail carries the tone at a glance, before you read the number. */}
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-[2px]", TONE_RAIL[tone])}
      />
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-r to-transparent",
          TONE_GLOW[tone]
        )}
      />

      <div className="relative p-3.5">
        <div className="flex items-start justify-between gap-2">
          <span className="text-2xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <DeltaChip delta={delta} polarity={deltaPolarity} />
        </div>

        <div
          className={cn(
            "tnum mt-2 text-2xl font-semibold leading-none tracking-tight",
            TONE_VALUE[tone]
          )}
        >
          {value}
        </div>

        <div className="mt-1.5 h-4 text-2xs text-muted-foreground">
          {footnote}
        </div>
      </div>
    </Card>
  );
}

function DeltaChip({
  delta,
  polarity,
}: {
  delta?: number | null;
  polarity: "positive-good" | "neutral";
}) {
  if (delta === null || delta === undefined || !Number.isFinite(delta)) {
    return null;
  }

  const flat = Math.abs(delta) < 0.05;
  const Icon = flat ? ArrowRight : delta > 0 ? ArrowUpRight : ArrowDownRight;

  const color =
    polarity === "neutral" || flat
      ? "text-muted-foreground"
      : delta > 0
        ? "text-profit"
        : "text-loss";

  return (
    <span
      className={cn("tnum flex items-center gap-0.5 text-2xs font-medium", color)}
      title={`${delta > 0 ? "Up" : delta < 0 ? "Down" : "Flat"} vs previous period`}
    >
      <Icon className="h-3 w-3" />
      {/* The arrow carries the direction, so the number stays unsigned —
          printing a sign here as well is how you end up with "+3%" next to a
          down arrow. */}
      {`${Math.abs(delta).toFixed(1)}%`}
    </span>
  );
}
