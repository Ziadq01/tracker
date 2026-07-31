import { ConnectionNotice } from "@/components/connection-notice";
import { PageHeader } from "@/components/layout/page-header";
import { MetricValue, StatusBadge, TypeLabel } from "@/components/metric-value";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FilterBar } from "@/components/analytics/filter-bar";
import { formatPeriodLabel, resolveRange } from "@/lib/date-ranges";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRatio,
} from "@/lib/metrics";
import { getBcAccounts } from "@/lib/queries";
import {
  profitTone,
  revenueTone,
  roasTone,
  spendTone,
} from "@/lib/tone-rules";

export const dynamic = "force-dynamic";

export const metadata = { title: "BC Accounts" };

export default async function BcAccountsPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const range = resolveRange(searchParams);
  const { data: accounts, error } = await getBcAccounts(range);
  const activeCount = accounts.filter((a) => a.is_active).length;

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="BC Accounts"
        subtitle={`${activeCount} active of ${accounts.length} · ${formatPeriodLabel(range.current)}`}
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

        {accounts.length === 0 ? (
          <p className="border-t border-border py-12 text-center text-xs text-secondary">
            No business center accounts yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Account</TableHead>
                <TableHead className="hidden md:table-cell">
                  TikTok BC ID
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  Creatives
                </TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead className="hidden text-right lg:table-cell">
                  Dropoff
                </TableHead>
                <TableHead className="text-right">State</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="max-w-[14rem]">
                    <span className="block truncate text-xs text-foreground">
                      {account.name}
                    </span>
                  </TableCell>

                  <TableCell className="hidden md:table-cell">
                    <span className="font-mono text-2xs text-secondary">
                      {account.tiktok_bc_id ?? "—"}
                    </span>
                  </TableCell>

                  <TableCell>
                    <TypeLabel type={account.type} />
                  </TableCell>

                  <TableCell className="hidden text-right text-xs sm:table-cell">
                    <MetricValue muted>
                      {formatNumber(account.creativeCount)}
                    </MetricValue>
                  </TableCell>

                  <TableCell className="text-right text-xs">
                    <MetricValue tone={spendTone()}>
                      {formatCurrency(account.metrics.adSpend)}
                    </MetricValue>
                  </TableCell>

                  <TableCell className="text-right text-xs">
                    <MetricValue tone={revenueTone()}>
                      {formatCurrency(account.metrics.revenue)}
                    </MetricValue>
                  </TableCell>

                  <TableCell className="text-right text-xs">
                    <MetricValue tone={profitTone(account.metrics.profit)}>
                      {formatCurrency(account.metrics.profit)}
                    </MetricValue>
                  </TableCell>

                  <TableCell className="text-right text-xs">
                    <MetricValue tone={roasTone(account.metrics.roas)}>
                      {formatRatio(account.metrics.roas)}
                    </MetricValue>
                  </TableCell>

                  <TableCell className="hidden text-right text-xs lg:table-cell">
                    <MetricValue muted>
                      {formatPercent(account.metrics.dropoffPct)}
                    </MetricValue>
                  </TableCell>

                  <TableCell className="text-right">
                    <StatusBadge active={Boolean(account.is_active)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
