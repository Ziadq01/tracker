import { FilterBar } from "@/components/analytics/filter-bar";
import { MiniTrend } from "@/components/analytics/mini-trend";
import { ConnectionNotice } from "@/components/connection-notice";
import { PageHeader } from "@/components/layout/page-header";
import { MetricValue } from "@/components/metric-value";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPeriodLabel, resolveRange } from "@/lib/date-ranges";
import { getOfferDailySeries } from "@/lib/entity-series";
import { formatCurrency, formatNumber } from "@/lib/metrics";
import { getOffers } from "@/lib/queries";
import { profitTone } from "@/lib/tone-rules";

export const dynamic = "force-dynamic";

export const metadata = { title: "Offers" };

export default async function OffersPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const range = resolveRange(searchParams);

  const [{ data: offers, error }, series] = await Promise.all([
    getOffers(range),
    getOfferDailySeries(range.current),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="Offers"
        subtitle={`${offers.length} offers · ${formatPeriodLabel(range.current)}`}
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

        {offers.length === 0 ? (
          <p className="border-t border-border py-12 text-center text-xs text-secondary">
            No offers yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Offer</TableHead>
                <TableHead className="hidden lg:table-cell">Revenue</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  EPC
                </TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  Conversions
                </TableHead>
                <TableHead className="hidden text-right md:table-cell">
                  Clicks
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {offers.map((offer) => {
                const daily = series.get(offer.id) ?? [];

                return (
                  <TableRow key={offer.id}>
                    <TableCell className="max-w-[16rem]">
                      <span className="block truncate text-xs text-foreground">
                        {offer.name}
                      </span>
                      <span className="block truncate font-mono text-2xs text-secondary">
                        {offer.glitchy_offer_id}
                      </span>
                    </TableCell>

                    {/* Revenue over the selected window. */}
                    <TableCell className="hidden lg:table-cell">
                      <MiniTrend
                        id={offer.id}
                        label={`${offer.name}: revenue over time`}
                        series={[
                          {
                            values: daily.map((d) => d.revenue),
                            color: "var(--chart-line)",
                            fill: true,
                          },
                        ]}
                      />
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <MetricValue>
                        {formatCurrency(offer.buyerMetrics.revenue)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <MetricValue>
                        {formatCurrency(offer.buyerMetrics.adSpend)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <MetricValue tone={profitTone(offer.buyerMetrics.profit)}>
                        {formatCurrency(offer.buyerMetrics.profit)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="hidden text-right text-xs sm:table-cell">
                      <MetricValue>
                        {formatCurrency(offer.buyerMetrics.epc)}
                      </MetricValue>
                    </TableCell>

                    {/* Conversions and clicks are the network's own figures. */}
                    <TableCell className="hidden text-right text-xs md:table-cell">
                      <MetricValue>
                        {formatNumber(offer.conversions)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="hidden text-right text-xs md:table-cell">
                      <MetricValue>
                        {formatNumber(offer.networkClicks)}
                      </MetricValue>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
