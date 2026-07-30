import { KpiCard } from "@/components/war-room/kpi-card";
import {
  formatCurrency,
  formatRatio,
  percentChange,
  toneFromThreshold,
  toneFromValue,
  type Metrics,
} from "@/lib/metrics";

/**
 * The five numbers a buyer checks first.
 *
 * Colour rules:
 *  - Spend is always red and Revenue always green — they are directional
 *    quantities, not judgements, and the constant colour makes the pair
 *    scannable.
 *  - Profit is green above zero.
 *  - ROAS is green above 1.00x — break-even, not zero, is the dividing line.
 *  - EPC is green when it clears Network CPA: earning more per network click
 *    than the click cost.
 */
export function KpiRow({
  current,
  previous,
}: {
  current: Metrics;
  previous: Metrics;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-5">
      <KpiCard
        label="Spend"
        value={formatCurrency(current.adSpend)}
        tone="loss"
        delta={percentChange(current.adSpend, previous.adSpend)}
        deltaPolarity="neutral"
        footnote={`${formatCurrency(current.tiktokCpa, { decimals: 3 })} TikTok CPA`}
      />

      <KpiCard
        label="Revenue"
        value={formatCurrency(current.revenue)}
        tone="profit"
        delta={percentChange(current.revenue, previous.revenue)}
        footnote={`${formatCurrency(current.networkCpa, { decimals: 3 })} network CPA`}
      />

      <KpiCard
        label="Profit"
        value={formatCurrency(current.profit)}
        tone={toneFromValue(current.profit)}
        delta={percentChange(current.profit, previous.profit)}
        footnote={`${formatCurrency(previous.profit)} previous period`}
      />

      <KpiCard
        label="ROAS"
        value={formatRatio(current.roas)}
        tone={toneFromThreshold(current.roas, 1)}
        delta={percentChange(current.roas, previous.roas)}
        footnote="break-even at 1.00x"
      />

      <KpiCard
        label="EPC"
        value={formatCurrency(current.epc, { decimals: 3 })}
        tone={toneFromThreshold(current.epc, current.networkCpa ?? 0)}
        delta={percentChange(current.epc, previous.epc)}
        footnote={`vs ${formatCurrency(current.networkCpa, { decimals: 3 })} network CPA`}
      />
    </div>
  );
}
