"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";

import { GlitchyAnalyticsView } from "@/components/analytics/glitchy-analytics-view";
import { NotificationPrompt } from "@/components/notifications/notification-prompt";

import { FilterBar } from "@/components/analytics/filter-bar";
import { FadeOnPending } from "@/components/motion/navigation-pending";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/metrics";
import { formatDateKeyLabel } from "@/lib/date-ranges";
import type { GlitchySyncResponse } from "@/app/api/glitchy/sync/route";

const POLL_MS = 30_000;

function customRangeLabel(from: string | null, to: string | null): string {
  const isKey = (v: string | null): v is string =>
    !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
  if (!isKey(from)) return "Custom Range";
  const start = formatDateKeyLabel(from);
  const end = isKey(to) ? formatDateKeyLabel(to) : start;
  return start === end ? start : `${start} – ${end}`;
}

const RANGE_KEY_MAP: Record<string, string> = {
  today: "today",
  yesterday: "yesterday",
  "7d": "7d",
  "30d": "30d",
  custom: "custom",
};

const ALLOWED_GRANULARITIES_MAP: Record<string, ("hourly" | "daily" | "monthly")[]> = {
  today: ["hourly", "daily"],
  yesterday: ["hourly", "daily"],
  "7d": ["daily", "hourly", "monthly"],
  "30d": ["daily", "monthly"],
  custom: ["daily", "monthly"],
};

export default function AnalyticsPage() {
  return (
    <React.Suspense fallback={null}>
      <AnalyticsInner />
    </React.Suspense>
  );
}

function AnalyticsInner() {
  const searchParams = useSearchParams();
  const rangeKey = searchParams.get("range") || "today";
  const activeRange = (["today", "yesterday", "7d", "30d", "custom"].includes(rangeKey) ? rangeKey : "today") as "today" | "yesterday" | "7d" | "30d" | "custom";
  const granularity = searchParams.get("granularity") || "hourly";
  const activeGranularity = (["hourly", "daily", "monthly"].includes(granularity) ? granularity : "hourly") as "hourly" | "daily" | "monthly";

  const apiRange = RANGE_KEY_MAP[activeRange] ?? "today";
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const [data, setData] = React.useState<GlitchySyncResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const prevConversions = React.useRef<number | null>(null);

  const cacheKey = `scaler-sync-${apiRange}-${from ?? ""}-${to ?? ""}`;

  const fetchData = React.useCallback(async () => {
    try {
      const params = new URLSearchParams({ range: apiRange });
      if (apiRange === "custom") {
        if (from) params.set("from", from);
        if (to) params.set("to", to);
      }
      const res = await fetch(`/api/glitchy/sync?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as GlitchySyncResponse;
      setData(json);
      setLoading(false);
      try { sessionStorage.setItem(cacheKey, JSON.stringify(json)); } catch {}
    } catch {
      // retry next tick
    }
  }, [apiRange, from, to, cacheKey]);

  React.useEffect(() => {
    // Show the last known data instantly, then refresh in the background.
    let hadCache = false;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setData(JSON.parse(cached) as GlitchySyncResponse);
        setLoading(false);
        hadCache = true;
      }
    } catch {}
    if (!hadCache) setLoading(true);

    void fetchData();
    const timer = setInterval(() => void fetchData(), POLL_MS);
    return () => clearInterval(timer);
  }, [fetchData, cacheKey]);

  return (
    <div className="flex min-h-screen flex-col">
      <NotificationPrompt />
      <div className="topmost-bar flex-1 space-y-6 pb-6 pr-4 md:space-y-8 md:py-6 md:pr-6">
        <section>
          <p className="tnum text-xs text-secondary md:text-[13px]">
            {activeRange === "today"
              ? "Today"
              : activeRange === "yesterday"
                ? "Yesterday"
                : activeRange === "7d"
                  ? "Last 7 Days"
                  : activeRange === "30d"
                    ? "Last 30 Days"
                    : customRangeLabel(
                        searchParams.get("from"),
                        searchParams.get("to")
                      )}
          </p>

          <div className="mt-2 flex flex-col items-stretch gap-y-4 md:flex-row md:flex-wrap md:items-baseline md:justify-between md:gap-x-8 md:gap-y-3">
            <FadeOnPending>
              {loading ? (
                <Skeleton className="h-[36px] w-full max-w-[16rem] md:h-[48px]" />
              ) : (
                <span className="animate-fade tnum block text-[36px] font-medium leading-none tracking-tight text-foreground md:text-[48px]">
                  {formatCurrency(data?.totalRevenue ?? 0)}
                </span>
              )}
            </FadeOnPending>

            <FilterBar
              activeRange={activeRange}
              activeGranularity={activeGranularity}
              allowedGranularities={ALLOWED_GRANULARITIES_MAP[activeRange] ?? ["daily"]}
              from={searchParams.get("from") ?? undefined}
              to={searchParams.get("to") ?? undefined}
              inline
            />
          </div>
        </section>

        {loading ? (
          <div className="space-y-8">
            <Skeleton className="h-[16rem]" />
            <Skeleton className="h-[20rem]" />
          </div>
        ) : data ? (
          <GlitchyAnalyticsView data={data} />
        ) : null}
      </div>
    </div>
  );
}
