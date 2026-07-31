import { FilterBar } from "@/components/analytics/filter-bar";
import { MiniTrend } from "@/components/analytics/mini-trend";
import { ConnectionNotice } from "@/components/connection-notice";
import { PageHeader } from "@/components/layout/page-header";
import { MetricValue, StatusBadge } from "@/components/metric-value";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPeriodLabel, resolveRange } from "@/lib/date-ranges";
import { getCreativeActivity, getCreativeDailySeries } from "@/lib/entity-series";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRatio,
} from "@/lib/metrics";
import { getCreatives, totalsOf } from "@/lib/queries";
import { formatDuration, formatRelative } from "@/lib/relative-time";
import { profitTone } from "@/lib/tone-rules";

export const dynamic = "force-dynamic";

export const metadata = { title: "Creatives" };

export default async function CreativesPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const now = new Date();
  const range = resolveRange(searchParams);

  const [{ data: creatives, error }, series, activity] = await Promise.all([
    getCreatives(range),
    getCreativeDailySeries(range.current),
    getCreativeActivity(range.current),
  ]);

  const totals = totalsOf(creatives);

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Creatives"
        subtitle={`${creatives.length} tracked · ${formatPeriodLabel(range.current)}`}
      />

      <FilterBar
        activeRange={range.key}
        activeGranularity={range.granularity}
        allowedGranularities={range.allowedGranularities}
        from={searchParams.from}
        to={searchParams.to}
        showGranularity={false}
      />

      <div className="flex-1 space-y-6 px-6 py-6">
        <ConnectionNotice error={error} />

        {creatives.length === 0 ? (
          <p className="border-t border-border py-12 text-center text-xs text-secondary">
            No creatives yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Creative</TableHead>
                <TableHead className="hidden md:table-cell">Offer</TableHead>
                <TableHead className="hidden lg:table-cell">BC Account</TableHead>
                <TableHead className="hidden xl:table-cell">Trend</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  EPC
                </TableHead>
                <TableHead className="hidden text-right xl:table-cell">
                  Net CPA
                </TableHead>
                <TableHead className="hidden text-right xl:table-cell">
                  Dropoff
                </TableHead>
                <TableHead className="hidden text-right xl:table-cell">
                  TT Clicks
                </TableHead>
                <TableHead className="hidden text-right xl:table-cell">
                  Net Clicks
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden text-right lg:table-cell">
                  Activity
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {creatives.map((creative) => {
                const daily = series.get(creative.id) ?? [];
                const times = activity.get(creative.id);

                return (
                  <TableRow key={creative.id}>
                    <TableCell className="max-w-[14rem]">
                      <span className="block truncate text-xs text-foreground">
                        {creative.name}
                      </span>
                    </TableCell>

                    <TableCell className="hidden max-w-[10rem] md:table-cell">
                      <span className="block truncate text-xs text-secondary">
                        {creative.offerName ?? "—"}
                      </span>
                    </TableCell>

                    <TableCell className="hidden max-w-[10rem] lg:table-cell">
                      <span className="block truncate text-xs text-secondary">
                        {creative.bcAccountName ?? "—"}
                      </span>
                    </TableCell>

                    {/* Revenue (filled) against profit (dashed), same scale. */}
                    <TableCell className="hidden xl:table-cell">
                      <MiniTrend
                        id={creative.id}
                        label={`${creative.name}: revenue and profit`}
                        series={[
                          {
                            values: daily.map((d) => d.revenue),
                            color: "var(--chart-line)",
                            fill: true,
                          },
                          {
                            values: daily.map((d) => d.profit),
                            color: "var(--chart-previous)",
                            dashed: true,
                          },
                        ]}
                      />
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <MetricValue>
                        {formatCurrency(creative.metrics.adSpend)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <MetricValue>
                        {formatCurrency(creative.metrics.revenue)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <span className="inline-flex items-baseline gap-1.5">
                        <MetricValue tone={profitTone(creative.metrics.profit)}>
                          {formatCurrency(creative.metrics.profit)}
                        </MetricValue>
                        <span className="tnum text-[11px] text-secondary">
                          {formatRatio(creative.metrics.roas)}
                        </span>
                      </span>
                    </TableCell>

                    <TableCell className="hidden text-right text-xs sm:table-cell">
                      <MetricValue>
                        {formatCurrency(creative.metrics.epc)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="hidden text-right text-xs xl:table-cell">
                      <MetricValue>
                        {formatCurrency(creative.metrics.networkCpa)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="hidden text-right text-xs xl:table-cell">
                      <MetricValue>
                        {formatPercent(creative.metrics.dropoffPct)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="hidden text-right text-xs xl:table-cell">
                      <MetricValue>
                        {formatNumber(creative.metrics.tiktokClicks)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="hidden text-right text-xs xl:table-cell">
                      <MetricValue>
                        {formatNumber(creative.metrics.networkClicks)}
                      </MetricValue>
                    </TableCell>

                    <TableCell>
                      <StatusBadge status={creative.status} />
                    </TableCell>

                    <TableCell className="hidden text-right lg:table-cell">
                      <div className="tnum text-2xs text-secondary">
                        {formatRelative(times?.last, now) ?? "—"}
                      </div>
                      <div className="tnum text-2xs text-profit">
                        {creative.status === "paused"
                          ? ""
                          : (formatDuration(times?.first, now) ?? "")}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>

            <TableFooter>
              <TableRow className="hover:bg-transparent">
                <TableCell className="text-2xs uppercase tracking-header text-secondary">
                  Total
                </TableCell>
                <TableCell className="hidden md:table-cell" />
                <TableCell className="hidden lg:table-cell" />
                <TableCell className="hidden xl:table-cell" />
                <TableCell className="text-right text-xs">
                  <MetricValue>{formatCurrency(totals.adSpend)}</MetricValue>
                </TableCell>
                <TableCell className="text-right text-xs">
                  <MetricValue>{formatCurrency(totals.revenue)}</MetricValue>
                </TableCell>
                <TableCell className="text-right text-xs">
                  <span className="inline-flex items-baseline gap-1.5">
                    <MetricValue tone={profitTone(totals.profit)}>
                      {formatCurrency(totals.profit)}
                    </MetricValue>
                    <span className="tnum text-[11px] text-secondary">
                      {formatRatio(totals.roas)}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="hidden text-right text-xs sm:table-cell">
                  <MetricValue>{formatCurrency(totals.epc)}</MetricValue>
                </TableCell>
                <TableCell className="hidden text-right text-xs xl:table-cell">
                  <MetricValue>{formatCurrency(totals.networkCpa)}</MetricValue>
                </TableCell>
                <TableCell className="hidden text-right text-xs xl:table-cell">
                  <MetricValue>{formatPercent(totals.dropoffPct)}</MetricValue>
                </TableCell>
                <TableCell className="hidden text-right text-xs xl:table-cell">
                  <MetricValue>{formatNumber(totals.tiktokClicks)}</MetricValue>
                </TableCell>
                <TableCell className="hidden text-right text-xs xl:table-cell">
                  <MetricValue>{formatNumber(totals.networkClicks)}</MetricValue>
                </TableCell>
                <TableCell />
                <TableCell className="hidden lg:table-cell" />
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </div>
    </div>
  );
}
