import { Suspense } from "react";

import { ConnectionNotice } from "@/components/connection-notice";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterBar } from "@/components/war-room/filter-bar";
import { RevenueChart } from "@/components/war-room/revenue-chart";
import { TopCreatives } from "@/components/war-room/top-creatives";
import {
  APP_TIMEZONE,
  formatPeriodLabel,
  resolveRange,
} from "@/lib/date-ranges";
import { formatNumber } from "@/lib/metrics";
import { getWarRoomData } from "@/lib/queries";
import { BUCKET_DESCRIPTION, buildComparisonSeries } from "@/lib/series";

export const dynamic = "force-dynamic";

type SearchParams = {
  range?: string;
  from?: string;
  to?: string;
  granularity?: string;
};

export default function WarRoomPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const range = resolveRange(searchParams);

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="War Room"
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
        fallback={<WarRoomSkeleton />}
      >
        <WarRoomContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function WarRoomContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const range = resolveRange(searchParams);
  const data = await getWarRoomData(range);

  const { points, unit } = buildComparisonSeries({
    currentRuns: data.currentRuns,
    previousRuns: data.previousRuns,
    range,
    metric: "revenue",
  });

  return (
    <div className="flex-1 space-y-10 px-6 py-6">
      <ConnectionNotice error={data.error} />

      <section>
        <div className="flex items-baseline justify-between gap-4 pb-4">
          <div>
            <h2 className="text-sm font-medium text-foreground">Revenue</h2>
            <p className="text-2xs text-secondary">
              {formatPeriodLabel(range.current)} vs{" "}
              {formatPeriodLabel(range.previous)}
            </p>
          </div>
          <span className="tnum text-2xs text-secondary">
            {formatNumber(data.runCount)} runs
          </span>
        </div>

        <RevenueChart
          points={points}
          currentLabel={formatPeriodLabel(range.current)}
          previousLabel={formatPeriodLabel(range.previous)}
          bucketDescription={BUCKET_DESCRIPTION[unit]}
        />
      </section>

      <TopCreatives creatives={data.topCreatives} />
    </div>
  );
}

function WarRoomSkeleton() {
  return (
    <div className="flex-1 space-y-10 px-6 py-6">
      <Skeleton className="h-[21rem]" />
      <Skeleton className="h-[16rem]" />
    </div>
  );
}
