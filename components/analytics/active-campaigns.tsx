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
import { formatCurrency, formatPercent, formatRatio } from "@/lib/metrics";
import type { TopCreative } from "@/lib/queries";
import {
  epcTone,
  netCpaTone,
  profitTone,
  revenueTone,
  roasTone,
  spendTone,
} from "@/lib/tone-rules";

export function ActiveCampaigns({ campaigns }: { campaigns: TopCreative[] }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-4 pb-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">
            Active Campaigns
          </h2>
          <p className="text-2xs text-secondary">Active first, then by profit</p>
        </div>
        <Link
          href="/creatives"
          className="text-2xs text-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          All creatives →
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <p className="border-t border-border py-10 text-center text-xs text-secondary">
          No campaign activity in this window.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-8">#</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead className="hidden md:table-cell">Offer</TableHead>
              <TableHead className="text-right">Spend</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">ROAS</TableHead>
              <TableHead className="hidden text-right sm:table-cell">
                EPC
              </TableHead>
              <TableHead className="hidden text-right lg:table-cell">
                Net CPA
              </TableHead>
              <TableHead className="hidden text-right lg:table-cell">
                TT CPA
              </TableHead>
              <TableHead className="hidden text-right lg:table-cell">
                Dropoff %
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {campaigns.map((campaign, index) => (
              <TableRow key={campaign.id}>
                <TableCell className="tnum text-2xs text-secondary">
                  {index + 1}
                </TableCell>

                <TableCell>
                  <StatusBadge status={campaign.status} />
                </TableCell>

                <TableCell className="max-w-[14rem]">
                  <div className="truncate text-xs text-foreground">
                    {campaign.name}
                  </div>
                  <div className="truncate text-2xs text-secondary">
                    {campaign.bcAccountName ?? "No BC account"}
                  </div>
                </TableCell>

                <TableCell className="hidden max-w-[12rem] md:table-cell">
                  <span className="block truncate text-xs text-secondary">
                    {campaign.offerName ?? "—"}
                  </span>
                </TableCell>

                <TableCell className="text-right text-xs">
                  <MetricValue tone={spendTone()}>
                    {formatCurrency(campaign.metrics.adSpend)}
                  </MetricValue>
                </TableCell>

                <TableCell className="text-right text-xs">
                  <MetricValue tone={revenueTone()}>
                    {formatCurrency(campaign.metrics.revenue)}
                  </MetricValue>
                </TableCell>

                <TableCell className="text-right text-xs">
                  <MetricValue tone={profitTone(campaign.metrics.profit)}>
                    {formatCurrency(campaign.metrics.profit)}
                  </MetricValue>
                </TableCell>

                <TableCell className="text-right text-xs">
                  <MetricValue tone={roasTone(campaign.metrics.roas)}>
                    {formatRatio(campaign.metrics.roas)}
                  </MetricValue>
                </TableCell>

                <TableCell className="hidden text-right text-xs sm:table-cell">
                  <MetricValue tone={epcTone(campaign.metrics.epc)}>
                    {formatCurrency(campaign.metrics.epc, { decimals: 3 })}
                  </MetricValue>
                </TableCell>

                <TableCell className="hidden text-right text-xs lg:table-cell">
                  <MetricValue tone={netCpaTone(campaign.metrics.networkCpa)}>
                    {formatCurrency(campaign.metrics.networkCpa, {
                      decimals: 3,
                    })}
                  </MetricValue>
                </TableCell>

                <TableCell className="hidden text-right text-xs lg:table-cell">
                  <MetricValue muted>
                    {formatCurrency(campaign.metrics.tiktokCpa, {
                      decimals: 3,
                    })}
                  </MetricValue>
                </TableCell>

                <TableCell className="hidden text-right text-xs lg:table-cell">
                  <MetricValue muted>
                    {formatPercent(campaign.metrics.dropoffPct)}
                  </MetricValue>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}
