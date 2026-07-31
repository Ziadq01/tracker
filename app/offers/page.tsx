import { FilterBar } from "@/components/analytics/filter-bar";
import { TrendChart } from "@/components/analytics/trend-chart";
import { ConnectionNotice } from "@/components/connection-notice";
import { formatPeriodLabel, resolveRange } from "@/lib/date-ranges";
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
        meta={
          <span className="tnum text-xs text-secondary">
            {formatPeriodLabel(range.current)}
          </span>
        }
      />

      <div className="flex-1 space-y-10 px-6 py-6">
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
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 pb-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-[13px] font-bold text-foreground">
                      {offer.name}
                    </h2>
                    <p className="truncate font-mono text-2xs text-secondary">
                      {offer.glitchy_offer_id}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
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
                  height={200}
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
    <span className="flex items-baseline gap-1.5">
      <span className="text-2xs uppercase tracking-header text-secondary">
        {label}
      </span>
      <span className={cn("tnum text-[13px] text-foreground", className)}>
        {value}
      </span>
    </span>
  );
}
