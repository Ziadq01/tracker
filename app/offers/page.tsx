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
import { FilterBar } from "@/components/war-room/filter-bar";
import { formatPeriodLabel, resolveRange } from "@/lib/date-ranges";
import { formatCurrency, formatNumber, formatRatio } from "@/lib/metrics";
import { getOffers } from "@/lib/queries";
import {
  epcTone,
  profitTone,
  revenueTone,
  roasTone,
  spendTone,
} from "@/lib/tone-rules";

export const dynamic = "force-dynamic";

export const metadata = { title: "Offers" };

export default async function OffersPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const range = resolveRange(searchParams);
  const { data: offers, error } = await getOffers(range);

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

        <section>
          <div className="pb-3">
            <h2 className="text-sm font-medium text-foreground">
              Offer performance
            </h2>
            <p className="text-2xs text-secondary">
              Network figures come from offer_stats; spend and profit come from
              your runs.
            </p>
          </div>

          {offers.length === 0 ? (
            <p className="border-t border-border py-12 text-center text-xs text-secondary">
              No offers yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Offer</TableHead>
                  <TableHead className="hidden sm:table-cell">ID</TableHead>
                  <TableHead className="text-right">Payout</TableHead>
                  <TableHead className="hidden text-right md:table-cell">
                    Creatives
                  </TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">
                    Net Clicks
                  </TableHead>
                  <TableHead className="hidden text-right lg:table-cell">
                    Conv.
                  </TableHead>
                  <TableHead className="hidden text-right lg:table-cell">
                    Network EPC
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {offers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell className="max-w-[16rem]">
                      <span className="block truncate text-xs text-foreground">
                        {offer.name}
                      </span>
                    </TableCell>

                    <TableCell className="hidden sm:table-cell">
                      <span className="font-mono text-2xs text-secondary">
                        {offer.glitchy_offer_id}
                      </span>
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <MetricValue muted>
                        {formatCurrency(Number(offer.payout ?? 0))}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="hidden text-right text-xs md:table-cell">
                      <MetricValue muted>
                        {formatNumber(offer.creativeCount)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <MetricValue tone={spendTone()}>
                        {formatCurrency(offer.buyerMetrics.adSpend)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <MetricValue tone={revenueTone()}>
                        {formatCurrency(offer.buyerMetrics.revenue)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <MetricValue tone={profitTone(offer.buyerMetrics.profit)}>
                        {formatCurrency(offer.buyerMetrics.profit)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <MetricValue tone={roasTone(offer.buyerMetrics.roas)}>
                        {formatRatio(offer.buyerMetrics.roas)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="hidden text-right text-xs lg:table-cell">
                      <MetricValue muted>
                        {formatNumber(offer.networkClicks)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="hidden text-right text-xs lg:table-cell">
                      <MetricValue muted>
                        {formatNumber(offer.conversions)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="hidden text-right text-xs lg:table-cell">
                      <MetricValue tone={epcTone(offer.networkEpc)}>
                        {formatCurrency(offer.networkEpc, { decimals: 3 })}
                      </MetricValue>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
    </div>
  );
}
