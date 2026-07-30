import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { MetricValue, StatusBadge } from "@/components/metric-value";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCurrency,
  formatRatio,
  toneFromThreshold,
  toneFromValue,
} from "@/lib/metrics";
import type { TopCreative } from "@/lib/queries";

export function TopCreatives({ creatives }: { creatives: TopCreative[] }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div>
          <h2 className="text-sm font-medium">Top Creatives</h2>
          <p className="text-2xs text-muted-foreground">
            Ranked by profit in the selected window
          </p>
        </div>
        <Link
          href="/creatives"
          className="flex items-center gap-1 text-2xs text-muted-foreground transition-colors hover:text-primary"
        >
          All creatives
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {creatives.length === 0 ? (
        <div className="px-4 py-10 text-center text-xs text-muted-foreground">
          No creative activity in this window.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8 text-center">#</TableHead>
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
                <TableCell className="text-center text-2xs text-muted-foreground">
                  {index + 1}
                </TableCell>

                <TableCell className="max-w-[14rem]">
                  <div className="truncate text-xs font-medium text-foreground">
                    {creative.name}
                  </div>
                  <div className="truncate text-2xs text-muted-foreground">
                    {creative.bcAccountName ?? "No BC account"}
                  </div>
                </TableCell>

                <TableCell className="hidden max-w-[12rem] md:table-cell">
                  <span className="block truncate text-xs text-muted-foreground">
                    {creative.offerName ?? "—"}
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

                <TableCell className="hidden text-right lg:table-cell">
                  <StatusBadge status={creative.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
