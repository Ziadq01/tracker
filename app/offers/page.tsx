import { FilterBar } from "@/components/analytics/filter-bar";
import { TrendChart } from "@/components/analytics/trend-chart";
import { ConnectionNotice } from "@/components/connection-notice";
import { resolveRange } from "@/lib/date-ranges";
import { getOfferSeries } from "@/lib/entity-series";
import { formatCurrency, formatRatio } from "@/lib/metrics";
import { getOffers } from "@/lib/queries";
import { profitTone } from "@/lib/tone-rules";
import { cn } from "@/lib/utils";

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
    getOfferSeries(range.current),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <FilterBar
        activeRange={range.key}
        activeGranularity={range.granularity}
        allowedGranularities={range.allowedGranularities}
        from={searchParams.from}
        to={searchParams.to}
        showGranularity={false}
        topmost
        bordered={false}
      />

      <div className="flex-1 space-y-8 px-4 py-6 md:space-y-10 md:px-6">
        <ConnectionNotice error={error} />

        {offers.length === 0 ? (
          <p className="border-t border-border py-12 text-center text-xs text-secondary">
            No offers yet.
          </p>
        ) : (
          offers.map((offer) => {
            const points = series.get(offer.id) ?? [];
            const m = offer.buyerMetrics;

            return (
              <section key={offer.id} className="border-t border-border pt-4">
                {/* Name over the stat strip on a phone, side by side at md. */}
                <div className="flex flex-col gap-y-3 pb-4 md:flex-row md:flex-wrap md:items-baseline md:justify-between md:gap-x-6 md:gap-y-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-xs font-bold text-foreground md:text-[13px]">
                      {offer.name}
                    </h2>
                    <p className="truncate font-mono text-2xs text-secondary">
                      {offer.glitchy_offer_id}
                    </p>
                  </div>

                  {/* Five stats never fit a phone's width, so the strip
                      scrolls rather than stacking into five lines. */}
                  <div className="scroll-x -mx-4 flex flex-nowrap items-baseline gap-x-5 px-4 md:mx-0 md:flex-wrap md:gap-x-6 md:gap-y-1 md:overflow-x-visible md:px-0">
                    <Stat label="Spend" value={formatCurrency(m.adSpend)} />
                    <Stat label="Revenue" value={formatCurrency(m.revenue)} />
                    <Stat
                      label="Profit"
                      value={formatCurrency(m.profit)}
                      className={cn(
                        profitTone(m.profit) === "profit" && "text-profit",
                        profitTone(m.profit) === "loss" && "text-loss"
                      )}
                    />
                    <Stat label="ROAS" value={formatRatio(m.roas)} />
                    <Stat label="EPC" value={formatCurrency(m.epc)} />
                  </div>
                </div>

                <TrendChart
                  points={points}
                  gradientId={`offer-${offer.id}`}
                  heightClass="h-[180px] md:h-[200px]"
                />
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <span className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap">
      <span className="text-2xs uppercase tracking-header text-secondary">
        {label}
      </span>
      <span
        className={cn("tnum text-xs text-foreground md:text-[13px]", className)}
      >
        {value}
      </span>
    </span>
  );
}
