import Link from "next/link";

import { MetricValue, StatusBadge } from "@/components/metric-value";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatRatio } from "@/lib/metrics";
import type { TopCreative } from "@/lib/queries";
import {
  epcTone,
  profitTone,
  revenueTone,
  roasTone,
  spendTone,
} from "@/lib/tone-rules";

export function TopCreatives({ creatives }: { creatives: TopCreative[] }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-4 pb-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">Top Creatives</h2>
          <p className="text-2xs text-secondary">
            Ranked by profit in the selected window
          </p>
        </div>
        <Link
          href="/creatives"
          className="text-2xs text-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          All creatives →
        </Link>
      </div>

      {creatives.length === 0 ? (
        <p className="border-t border-border py-10 text-center text-xs text-secondary">
          No creative activity in this window.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8">#</TableHead>
              <TableHead>Creative</TableHead>
              <TableHead className="hidden md:table-cell">Offer</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                EPC
              </TableHead>
              <TableHead className="hidden text-right lg:table-cell">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {creatives.map((creative, index) => (
              <TableRow key={creative.id}>
                <TableCell className="tnum text-2xs text-secondary">
                  {index + 1}
                </TableCell>

                <TableCell className="max-w-[14rem]">
                  <div className="truncate text-xs text-foreground">
                    {creative.name}
                  </div>
                  <div className="truncate text-2xs text-secondary">
                    {creative.bcAccountName ?? "No BC account"}
                  </div>
                </TableCell>

                <TableCell className="hidden max-w-[12rem] md:table-cell">
                  <span className="block truncate text-xs text-secondary">
                    {creative.offerName ?? "—"}
                  </span>
                </TableCell>

                <TableCell className="text-right text-xs">
                  <MetricValue tone={spendTone()}>
                    {formatCurrency(creative.metrics.adSpend)}
                  </MetricValue>
                </TableCell>

                <TableCell className="text-right text-xs">
                  <MetricValue tone={revenueTone()}>
                    {formatCurrency(creative.metrics.revenue)}
                  </MetricValue>
                </TableCell>

                <TableCell className="text-right text-xs">
                  <MetricValue tone={profitTone(creative.metrics.profit)}>
                    {formatCurrency(creative.metrics.profit)}
                  </MetricValue>
                </TableCell>

                <TableCell className="text-right text-xs">
                  <MetricValue tone={roasTone(creative.metrics.roas)}>
                    {formatRatio(creative.metrics.roas)}
                  </MetricValue>
                </TableCell>

                <TableCell className="hidden text-right text-xs sm:table-cell">
                  <MetricValue tone={epcTone(creative.metrics.epc)}>
                    {formatCurrency(creative.metrics.epc, { decimals: 3 })}
                  </MetricValue>
                </TableCell>

                <TableCell className="hidden text-right lg:table-cell">
                  <StatusBadge status={creative.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
