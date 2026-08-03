"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { FilterBar } from "@/components/analytics/filter-bar";
import { TrendChart } from "@/components/analytics/trend-chart";
import { MobileRedirect } from "@/components/layout/mobile-redirect";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  GlitchySyncResponse,
  GlitchyOffer,
} from "@/app/api/glitchy/sync/route";
import type { DualPoint } from "@/lib/dual-series";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const POLL_MS = 30_000;

const RANGE_KEY_MAP: Record<string, string> = {
  hour: "today",
  today: "today",
  yesterday: "yesterday",
  "7d": "7d",
  "30d": "30d",
  custom: "today",
};

export default function OffersPage() {
  const searchParams = useSearchParams();
  const rangeKey = searchParams.get("range") || "today";
  const activeRange = (
    ["hour", "today", "yesterday", "7d", "30d", "custom"].includes(rangeKey)
      ? rangeKey
      : "today"
  ) as "hour" | "today" | "yesterday" | "7d" | "30d" | "custom";

  const apiRange = RANGE_KEY_MAP[activeRange] ?? "today";

  const [data, setData] = React.useState<GlitchySyncResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchData = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/glitchy/sync?range=${apiRange}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as GlitchySyncResponse;
      setData(json);
      setLoading(false);
    } catch {
      // retry next tick
    }
  }, [apiRange]);

  React.useEffect(() => {
    setLoading(true);
    void fetchData();
    const timer = setInterval(() => void fetchData(), POLL_MS);
    return () => clearInterval(timer);
  }, [fetchData]);

  return (
    <div className="flex min-h-screen flex-col">
      <MobileRedirect />

      <FilterBar
        activeRange={activeRange}
        activeGranularity="daily"
        allowedGranularities={["daily"]}
        from={searchParams.get("from") ?? undefined}
        to={searchParams.get("to") ?? undefined}
        showGranularity={false}
        topmost
        bordered={false}
      />

      <div className="flex-1 space-y-8 px-4 py-6 md:space-y-10 md:px-6">
        {loading ? (
          <div className="space-y-8">
            <Skeleton className="h-[12rem]" />
            <Skeleton className="h-[12rem]" />
          </div>
        ) : !data || data.offers.length === 0 ? (
          <p className="border-t border-border py-12 text-center text-xs text-secondary">
            No offers yet.
          </p>
        ) : (
          data.offers.map((offer) => (
            <OfferSection key={offer.offerId} offer={offer} data={data} />
          ))
        )}
      </div>
    </div>
  );
}

function OfferSection({
  offer,
  data,
}: {
  offer: GlitchyOffer;
  data: GlitchySyncResponse;
}) {
  // Build per-offer timeline from the raw timeline by filtering stats
  // The API already groups by offer in the response but timeline is global.
  // For offer charts we'll use the global timeline shape but this is approximate.
  // A proper per-offer timeline would need API changes, so we show the global one.
  const points: DualPoint[] = data.timeline.map((p) => ({
    label: p.label,
    revenue: p.revenue,
    clicks: p.clicks,
  }));

  return (
    <section className="border-t border-border pt-4">
      <div className="flex flex-col gap-y-3 pb-4 md:flex-row md:flex-wrap md:items-baseline md:justify-between md:gap-x-6 md:gap-y-2">
        <div className="min-w-0">
          <h2 className="truncate text-xs font-bold text-foreground md:text-[13px]">
            {offer.name}
          </h2>
          <p className="truncate font-mono text-2xs text-secondary">
            #{offer.offerId}
          </p>
        </div>

        <div className="scroll-x -mx-4 flex flex-nowrap items-baseline gap-x-5 px-4 md:mx-0 md:flex-wrap md:gap-x-6 md:gap-y-1 md:overflow-x-visible md:px-0">
          <Stat label="Revenue" value={formatCurrency(offer.revenue)} />
          <Stat label="Conversions" value={formatNumber(offer.conversions)} />
          <Stat label="Clicks" value={formatNumber(offer.clicks)} />
          <Stat
            label="EPC"
            value={
              offer.epc !== null ? formatCurrency(offer.epc) : "—"
            }
          />
          <Stat
            label="CVR"
            value={
              offer.cvr !== null ? formatPercent(offer.cvr) : "—"
            }
          />
        </div>
      </div>

      <TrendChart
        points={points}
        gradientId={`offer-${offer.offerId}`}
        heightClass="h-[180px] md:h-[200px]"
      />
    </section>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <span className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-2xs uppercase tracking-header text-secondary">
        {label}
      </span>
      <span
        className={cn("tnum text-xs text-foreground md:text-[13px]", className)}
      >
        {value}
      </span>
    </span>
  );
}
