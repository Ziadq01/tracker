"use client";

import * as React from "react";

import { GlitchyCampaignTable } from "@/components/analytics/glitchy-campaign-table";
import { TrendChart } from "@/components/analytics/trend-chart";
import { FadeOnPending } from "@/components/motion/navigation-pending";
import type { GlitchySyncResponse, GlitchyTimePoint } from "@/app/api/glitchy/sync/route";
import type { DualPoint } from "@/lib/dual-series";
import { cn } from "@/lib/utils";

function toDualPoints(timeline: GlitchyTimePoint[]): DualPoint[] {
  return timeline.map((p) => ({
    label: p.label,
    revenue: p.revenue,
    clicks: p.clicks,
  }));
}

type Props = {
  data: GlitchySyncResponse;
};

export function GlitchyAnalyticsView({ data }: Props) {
  const [selectedSource, setSelectedSource] = React.useState<string | null>(
    null
  );

  const selected = selectedSource
    ? data.campaigns.find((c) => c.source === selectedSource) ?? null
    : null;

  const points = selected
    ? toDualPoints(data.timelineByCampaign[selected.source] ?? [])
    : toDualPoints(data.timeline);

  const toggle = (source: string) =>
    setSelectedSource((current) => (current === source ? null : source));

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pb-2">
          <h2 className="truncate text-xs font-bold text-foreground md:text-[13px]">
            {selected ? selected.source : "All campaigns"}
          </h2>

          {selected && (
            <button
              type="button"
              onClick={() => setSelectedSource(null)}
              className="inline-flex min-h-[44px] items-center text-2xs text-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline md:min-h-0"
            >
              All
            </button>
          )}

          <span
            className={cn(
              "text-2xs text-nav-muted",
              selected && "sr-only"
            )}
          >
            Tap a campaign name to isolate it
          </span>
        </div>

        <FadeOnPending>
          <TrendChart
            points={points}
            gradientId="analytics"
            key={selected ? selected.source : "all"}
          />
        </FadeOnPending>
      </div>

      <GlitchyCampaignTable
        campaigns={data.campaigns}
        selectedSource={selectedSource}
        onSelectCampaign={toggle}
      />
    </div>
  );
}
