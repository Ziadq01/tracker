import { Suspense } from "react";

import { ActiveCampaigns } from "@/components/analytics/active-campaigns";
import { FilterBar } from "@/components/analytics/filter-bar";
import { RevenueChart } from "@/components/analytics/revenue-chart";
import { ConnectionNotice } from "@/components/connection-notice";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  APP_TIMEZONE,
  formatPeriodLabel,
  resolveRange,
} from "@/lib/date-ranges";
import { formatCurrency, formatNumber } from "@/lib/metrics";
import { getWarRoomData, rankCreatives } from "@/lib/queries";
import { buildComparisonSeries } from "@/lib/series";
import { sortCampaigns } from "@/lib/sort-campaigns";

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
        meta={
          <span className="hidden text-2xs text-secondary sm:block">
            vs {formatPeriodLabel(range.previous)}
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
  const range = resolveRange(searchParams);
  const data = await getWarRoomData(range);

  // rankCreatives without a limit returns every creative with activity in the
  // window; sortCampaigns then orders them active-first, profit-descending.
  const campaigns = sortCampaigns(rankCreatives(data.currentRuns));

  const { points } = buildComparisonSeries({
    currentRuns: data.currentRuns,
    previousRuns: data.previousRuns,
    range,
    metric: "revenue",
  });

  return (
    <div className="flex-1 space-y-10 px-6 py-6">
      <ConnectionNotice error={data.error} />

      <ActiveCampaigns campaigns={campaigns} />

      <section>
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
          <div>
            <p className="tnum text-4xl font-bold tracking-tight text-foreground">
              {formatCurrency(data.current.revenue)}
            </p>
            <p className="mt-1 text-xs text-secondary">
              Revenue · {formatPeriodLabel(range.current)}
            </p>
          </div>
          <span className="tnum text-2xs text-secondary">
            {formatNumber(data.runCount)} runs
          </span>
        </div>

        <div className="mt-6">
          <RevenueChart
            points={points}
            currentLabel={formatPeriodLabel(range.current)}
            previousLabel={formatPeriodLabel(range.previous)}
          />
        </div>
      </section>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="flex-1 space-y-10 px-6 py-6">
      <Skeleton className="h-[20rem]" />
      <Skeleton className="h-[22rem]" />
    </div>
  );
}
