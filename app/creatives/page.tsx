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
import { FilterBar } from "@/components/war-room/filter-bar";
import { formatPeriodLabel, resolveRange } from "@/lib/date-ranges";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRatio,
  toneFromThreshold,
  toneFromValue,
} from "@/lib/metrics";
import { getCreatives, totalsOf } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = { title: "Creatives" };

export default async function CreativesPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const range = resolveRange(searchParams);
  const { data: creatives, error } = await getCreatives(range);
  const totals = totalsOf(creatives);

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Creatives"
        subtitle={`${creatives.length} tracked · metrics for ${formatPeriodLabel(range.current)}`}
      />

      <FilterBar
        activeRange={range.key}
        activeGranularity={range.granularity}
        allowedGranularities={range.allowedGranularities}
        from={searchParams.from}
        to={searchParams.to}
        showGranularity={false}
      />

      <div className="flex-1 space-y-3 p-4">
        <ConnectionNotice error={error} />

        <div className="rounded-lg border border-border bg-card">
          {creatives.length === 0 ? (
            <div className="px-4 py-12 text-center text-xs text-muted-foreground">
              No creatives yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Creative</TableHead>
                  <TableHead className="hidden md:table-cell">Offer</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    BC Account
                  </TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">
                    EPC
                  </TableHead>
                  <TableHead className="hidden text-right xl:table-cell">
                    Net CPA
                  </TableHead>
                  <TableHead className="hidden text-right xl:table-cell">
                    TT CPA
                  </TableHead>
                  <TableHead className="hidden text-right xl:table-cell">
                    Dropoff
                  </TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {creatives.map((creative) => (
                  <TableRow key={creative.id}>
                    <TableCell className="max-w-[16rem]">
                      <span className="block truncate text-xs font-medium">
                        {creative.name}
                      </span>
                    </TableCell>

                    <TableCell className="hidden max-w-[12rem] md:table-cell">
                      <span className="block truncate text-xs text-muted-foreground">
                        {creative.offerName ?? "—"}
                      </span>
                    </TableCell>

                    <TableCell className="hidden max-w-[12rem] lg:table-cell">
                      <span className="block truncate text-xs text-muted-foreground">
                        {creative.bcAccountName ?? "—"}
                      </span>
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <MetricValue tone="loss">
                        {formatCurrency(creative.metrics.adSpend)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <MetricValue tone="profit">
                        {formatCurrency(creative.metrics.revenue)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="text-right text-xs font-medium">
                      <MetricValue tone={toneFromValue(creative.metrics.profit)}>
                        {formatCurrency(creative.metrics.profit)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <MetricValue
                        tone={toneFromThreshold(creative.metrics.roas, 1)}
                      >
                        {formatRatio(creative.metrics.roas)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="hidden text-right text-xs sm:table-cell">
                      <MetricValue muted>
                        {formatCurrency(creative.metrics.epc, { decimals: 3 })}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="hidden text-right text-xs xl:table-cell">
                      <MetricValue muted>
                        {formatCurrency(creative.metrics.networkCpa, {
                          decimals: 3,
                        })}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="hidden text-right text-xs xl:table-cell">
                      <MetricValue muted>
                        {formatCurrency(creative.metrics.tiktokCpa, {
                          decimals: 3,
                        })}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="hidden text-right text-xs xl:table-cell">
                      <MetricValue muted>
                        {formatPercent(creative.metrics.dropoffPct)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="text-right">
                      <StatusBadge status={creative.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>

              <TableFooter>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="text-2xs uppercase tracking-wider text-muted-foreground">
                    Total
                  </TableCell>
                  <TableCell className="hidden md:table-cell" />
                  <TableCell className="hidden lg:table-cell" />
                  <TableCell className="text-right text-xs">
                    <MetricValue tone="loss">
                      {formatCurrency(totals.adSpend)}
                    </MetricValue>
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    <MetricValue tone="profit">
                      {formatCurrency(totals.revenue)}
                    </MetricValue>
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    <MetricValue tone={toneFromValue(totals.profit)}>
                      {formatCurrency(totals.profit)}
                    </MetricValue>
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    <MetricValue tone={toneFromThreshold(totals.roas, 1)}>
                      {formatRatio(totals.roas)}
                    </MetricValue>
                  </TableCell>
                  <TableCell className="hidden text-right text-xs sm:table-cell">
                    <MetricValue muted>
                      {formatCurrency(totals.epc, { decimals: 3 })}
                    </MetricValue>
                  </TableCell>
                  <TableCell className="hidden text-right text-xs xl:table-cell">
                    <MetricValue muted>
                      {formatCurrency(totals.networkCpa, { decimals: 3 })}
                    </MetricValue>
                  </TableCell>
                  <TableCell className="hidden text-right text-xs xl:table-cell">
                    <MetricValue muted>
                      {formatCurrency(totals.tiktokCpa, { decimals: 3 })}
                    </MetricValue>
                  </TableCell>
                  <TableCell className="hidden text-right text-xs xl:table-cell">
                    <MetricValue muted>
                      {formatPercent(totals.dropoffPct)}
                    </MetricValue>
                  </TableCell>
                  <TableCell className="text-right text-2xs text-muted-foreground">
                    {formatNumber(creatives.length)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
