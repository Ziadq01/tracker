import { Suspense } from "react";

import { CampaignTable } from "@/components/analytics/campaign-table";
import { FilterBar } from "@/components/analytics/filter-bar";
import { RevenueChart } from "@/components/analytics/revenue-chart";
import { ConnectionNotice } from "@/components/connection-notice";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildCampaignViews } from "@/lib/campaign-view";
import {
  APP_TIMEZONE,
  formatPeriodLabel,
  resolveRange,
} from "@/lib/date-ranges";
import { formatCurrency } from "@/lib/metrics";
import { getWarRoomData, rankCreatives } from "@/lib/queries";
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
      <PageHeader
        title="Analytics"
        subtitle={`${range.label} · all times ${APP_TIMEZONE.replace("_", " ")}`}
      />

      <FilterBar
        activeRange={range.key}
        activeGranularity={range.granularity}
        allowedGranularities={range.allowedGranularities}
        from={searchParams.from}
        to={searchParams.to}
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
  const range = resolveRange(searchParams);
  const data = await getWarRoomData(range);

  const campaigns = buildCampaignViews({
    ranked: rankCreatives(data.currentRuns),
    runs: data.currentRuns,
  });

  const { points } = buildComparisonSeries({
    currentRuns: data.currentRuns,
    previousRuns: data.previousRuns,
    range,
    metric: "revenue",
  });

  return (
    <div className="flex-1 space-y-8 px-6 py-6">
      <ConnectionNotice error={data.error} />

      {/* The number floats above the chart — no card, border, or background. */}
      <section>
        <p className="tnum text-[48px] font-bold leading-none tracking-tight text-foreground">
          {formatCurrency(data.current.revenue)}
        </p>
        <p className="mt-2 text-[13px] text-secondary">
          Revenue · {formatPeriodLabel(range.current)}
        </p>
      </section>

      <section>
        <RevenueChart
          points={points}
          currentLabel={formatPeriodLabel(range.current)}
          previousLabel={formatPeriodLabel(range.previous)}
        />
      </section>

      <CampaignTable campaigns={campaigns} />
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="flex-1 space-y-8 px-6 py-6">
      <Skeleton className="h-[4.5rem]" />
      <Skeleton className="h-[19rem]" />
      <Skeleton className="h-[20rem]" />
    </div>
  );
}
