import { Suspense, cache } from "react";

import { AnalyticsView } from "@/components/analytics/analytics-view";
import { EmptyWindowNotice } from "@/components/analytics/empty-window-notice";
import { FilterBar } from "@/components/analytics/filter-bar";
import { TestNotificationButton } from "@/components/notifications/test-notification-button";
import { ConnectionNotice } from "@/components/connection-notice";
import { FadeOnPending } from "@/components/motion/navigation-pending";
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

/**
 * The revenue figure and the rest of the page suspend separately so the filter
 * bar beside the figure stays interactive while data loads. `cache` keys on the
 * primitive search params — not the resolved range object, whose identity
 * changes per call — so both boundaries share a single fetch.
 */
const load = cache(
  async (
    range?: string,
    from?: string,
    to?: string,
    granularity?: string
  ) => {
    const resolved = resolveRange({ range, from, to, granularity });
    return { range: resolved, data: await getWarRoomData(resolved) };
  }
);

const loadFor = (p: SearchParams) => load(p.range, p.from, p.to, p.granularity);

export default function AnalyticsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const range = resolveRange(searchParams);

  return (
    <div className="flex min-h-screen flex-col">
      {/* topmost-bar keeps this clear of the fixed mobile menu trigger. */}
      <div className="topmost-bar flex-1 space-y-6 pb-6 pr-4 md:space-y-8 md:py-6 md:pr-6">
        <section>
          <p className="tnum text-xs text-secondary md:text-[13px]">
            {formatPeriodLabel(range.current)}
          </p>

          {/* Stacked and full width on mobile; revenue left, filters hard
              right on one line from md up. */}
          <div className="mt-2 flex flex-col items-stretch gap-y-4 md:flex-row md:flex-wrap md:items-baseline md:justify-between md:gap-x-8 md:gap-y-3">
            {/* Dims while the new range loads; the figure itself then fades
                in with its new value. */}
            <FadeOnPending>
              <Suspense
                fallback={
                  <Skeleton className="h-[36px] w-full max-w-[16rem] md:h-[48px]" />
                }
              >
                <RevenueFigure searchParams={searchParams} />
              </Suspense>
            </FadeOnPending>

            <FilterBar
              activeRange={range.key}
              activeGranularity={range.granularity}
              allowedGranularities={range.allowedGranularities}
              from={searchParams.from}
              to={searchParams.to}
              inline
            />
          </div>
        </section>

        <Suspense
          key={JSON.stringify(searchParams)}
          fallback={<AnalyticsSkeleton />}
        >
          <AnalyticsBody searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function RevenueFigure({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { data } = await loadFor(searchParams);

  return (
    // Keyed so the element remounts when the range changes and the fade
    // replays. Keying the Suspense boundary instead would risk flashing its
    // fallback in place of the previous value.
    <span
      key={JSON.stringify(searchParams)}
      className="animate-fade tnum block text-[36px] font-medium leading-none tracking-tight text-foreground md:text-[48px]"
    >
      {formatCurrency(data.current.revenue)}
    </span>
  );
}

async function AnalyticsBody({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const now = new Date();
  const { range, data } = await loadFor(searchParams);

  const diagnosis =
    data.runCount === 0 && !data.error ? await diagnoseEmptyWindow() : null;

  const campaigns = buildCampaignViews({
    ranked: rankCreatives(data.currentRuns),
    runs: data.currentRuns,
    formatLastActive: (iso) => formatRelative(iso, now),
    formatRunning: (iso) => formatDuration(iso, now),
  });

  /**
   * Builds the two-line series for a set of runs. Called once for everything
   * and once per campaign, all through the same `buildComparisonSeries`, so
   * every series is bucketed identically and the chart can swap between them
   * without a refetch.
   */
  const seriesFor = (runs: typeof data.currentRuns) =>
    zipSeries(
      buildComparisonSeries({
        currentRuns: runs,
        previousRuns: data.previousRuns,
        range,
        metric: "revenue",
      }).points,
      buildComparisonSeries({
        currentRuns: runs,
        previousRuns: data.previousRuns,
        range,
        metric: "networkClicks",
      }).points
    );

  const points = seriesFor(data.currentRuns);

  // One series per campaign, shipped with the page. At a media buyer's scale
  // (tens of campaigns x tens of buckets) this is a few KB; if a workspace ever
  // carried hundreds of campaigns, this is the thing to move behind a param.
  const runsByCampaign = new Map<string, typeof data.currentRuns>();
  for (const run of data.currentRuns) {
    const id = run.creative_id;
    if (!id) continue;
    const bucket = runsByCampaign.get(id);
    if (bucket) bucket.push(run);
    else runsByCampaign.set(id, [run]);
  }

  const seriesByCampaign = Object.fromEntries(
    campaigns.map((campaign) => [
      campaign.id,
      seriesFor(runsByCampaign.get(campaign.id) ?? []),
    ])
  );

  return (
    <div className="space-y-8">
      <ConnectionNotice error={data.error} />

      {/* Nothing to plot means one message, not an empty chart above an empty
          table above a notice. */}
      {data.runCount === 0 ? (
        <EmptyWindowNotice diagnosis={diagnosis} />
      ) : (
        <AnalyticsView
          campaigns={campaigns}
          allPoints={points}
          seriesByCampaign={seriesByCampaign}
        />
      )}

      <TestNotificationButton />
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-[16rem]" />
      <Skeleton className="h-[20rem]" />
    </div>
  );
}
