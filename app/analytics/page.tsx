import { Suspense } from "react";

import { CampaignTable } from "@/components/analytics/campaign-table";
import { FilterBar } from "@/components/analytics/filter-bar";
import { RevenueChart } from "@/components/analytics/revenue-chart";
import { ConnectionNotice } from "@/components/connection-notice";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getCampaignSettings,
  getSparklines,
  SPARKLINE_DAYS,
} from "@/lib/campaign-data";
import { buildCampaignViews, daysInPeriod } from "@/lib/campaign-view";
import {
  APP_TIMEZONE,
  formatPeriodLabel,
  resolveRange,
} from "@/lib/date-ranges";
import { formatCurrency, formatNumber } from "@/lib/metrics";
import { getWarRoomData, rankCreatives } from "@/lib/queries";
import { formatRelative } from "@/lib/relative-time";
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
  const now = new Date();
  const range = resolveRange(searchParams);

  const data = await getWarRoomData(range);
  const [{ settings, migrationMissing }, sparklines] = await Promise.all([
    getCampaignSettings(),
    getSparklines(now),
  ]);

  const campaigns = buildCampaignViews({
    ranked: rankCreatives(data.currentRuns),
    runs: data.currentRuns,
    settings,
    sparklines,
    sparklineLength: SPARKLINE_DAYS,
    formatRelative: (iso) => formatRelative(iso, now),
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

      {migrationMissing && (
        <div className="border border-border p-4">
          <p className="text-xs font-medium text-foreground">
            Campaign controls need a migration
          </p>
          <p className="mt-1 text-2xs leading-relaxed text-secondary">
            Run{" "}
            <code className="bg-surface px-1 py-0.5 font-mono text-[0.65rem] text-foreground">
              supabase/migrations/0001_campaign_controls.sql
            </code>{" "}
            to add <code className="font-mono">daily_budget</code>,{" "}
            <code className="font-mono">is_starred</code> and{" "}
            <code className="font-mono">flag_status</code>. Until then budgets,
            stars and flags read as defaults and won&apos;t save.
          </p>
        </div>
      )}

      {/* Chart sits above everything, including the total. */}
      <section>
        <RevenueChart
          points={points}
          currentLabel={formatPeriodLabel(range.current)}
          previousLabel={formatPeriodLabel(range.previous)}
        />
      </section>

      <section className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
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
      </section>

      <CampaignTable campaigns={campaigns} days={daysInPeriod(range.current)} />
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="flex-1 space-y-8 px-6 py-6">
      <Skeleton className="h-[19rem]" />
      <Skeleton className="h-[4rem]" />
      <Skeleton className="h-[20rem]" />
    </div>
  );
}
