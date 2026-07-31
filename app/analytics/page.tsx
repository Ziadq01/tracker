import { Suspense } from "react";

import { CampaignTable } from "@/components/analytics/campaign-table";
import { EmptyWindowNotice } from "@/components/analytics/empty-window-notice";
import { FilterBar } from "@/components/analytics/filter-bar";
import { TrendChart } from "@/components/analytics/trend-chart";
import { ConnectionNotice } from "@/components/connection-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { buildCampaignViews } from "@/lib/campaign-view";
import { formatPeriodLabel, resolveRange } from "@/lib/date-ranges";
import { diagnoseEmptyWindow } from "@/lib/diagnostics";
import { zipSeries } from "@/lib/dual-series";
import { formatCurrency } from "@/lib/metrics";
import { getWarRoomData, rankCreatives } from "@/lib/queries";
import { formatDuration, formatRelative } from "@/lib/relative-time";
import { buildComparisonSeries } from "@/lib/series";

export const dynamic = "force-dynamic";

export const metadata = { title: "Analytics" };

type SearchParams = {
  range?: string;
  from?: string;
  to?: string;
  granularity?: string;
};

export default function AnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const range = resolveRange(searchParams);

  return (
    <div className="flex min-h-screen flex-col">
      <FilterBar
        activeRange={range.key}
        activeGranularity={range.granularity}
        allowedGranularities={range.allowedGranularities}
        from={searchParams.from}
        to={searchParams.to}
        topmost
        bordered={false}
        // The date range lives on the right of this row, opposite the presets.
        meta={
          <span className="tnum text-xs text-secondary">
            {formatPeriodLabel(range.current)}
          </span>
        }
      />

      <Suspense
        key={JSON.stringify(searchParams)}
        fallback={<AnalyticsSkeleton />}
      >
        <AnalyticsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AnalyticsContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const now = new Date();
  const range = resolveRange(searchParams);
  const data = await getWarRoomData(range);

  const diagnosis =
    data.runCount === 0 && !data.error ? await diagnoseEmptyWindow() : null;

  const campaigns = buildCampaignViews({
    ranked: rankCreatives(data.currentRuns),
    runs: data.currentRuns,
    formatLastActive: (iso) => formatRelative(iso, now),
    formatRunning: (iso) => formatDuration(iso, now),
  });

  const seriesArgs = {
    currentRuns: data.currentRuns,
    previousRuns: data.previousRuns,
    range,
  };
  const points = zipSeries(
    buildComparisonSeries({ ...seriesArgs, metric: "revenue" }).points,
    buildComparisonSeries({ ...seriesArgs, metric: "networkClicks" }).points
  );

  return (
    <div className="flex-1 space-y-8 px-6 py-6">
      <ConnectionNotice error={data.error} />

      {diagnosis && (
        <EmptyWindowNotice diagnosis={diagnosis} rangeLabel={range.label} />
      )}

      {/* The number floats above the chart — no card, border, or background. */}
      <section>
        <p className="tnum text-[48px] font-medium leading-none tracking-tight text-foreground">
          {formatCurrency(data.current.revenue)}
        </p>
        <p className="mt-2 text-[13px] text-secondary">Revenue</p>
      </section>

      <TrendChart points={points} gradientId="analytics" />

      <CampaignTable campaigns={campaigns} />
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="flex-1 space-y-8 px-6 py-6">
      <Skeleton className="h-[4.5rem]" />
      <Skeleton className="h-[16rem]" />
      <Skeleton className="h-[20rem]" />
    </div>
  );
}
