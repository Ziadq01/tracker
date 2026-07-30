import { ConnectionNotice } from "@/components/connection-notice";
import { PageHeader } from "@/components/layout/page-header";
import { MetricValue, TypeBadge } from "@/components/metric-value";
import { Badge } from "@/components/ui/badge";
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
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRatio,
  toneFromThreshold,
  toneFromValue,
} from "@/lib/metrics";
import { getBcAccounts } from "@/lib/queries";

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

      <div className="flex-1 space-y-3 p-4">
        <ConnectionNotice error={error} />

        <div className="rounded-lg border border-border bg-card">
          {accounts.length === 0 ? (
            <div className="px-4 py-12 text-center text-xs text-muted-foreground">
              No business center accounts yet.
            </div>
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
                  <TableRow
                    key={account.id}
                    className={account.is_active ? undefined : "opacity-55"}
                  >
                    <TableCell className="max-w-[14rem]">
                      <span className="block truncate text-xs font-medium">
                        {account.name}
                      </span>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      <span className="font-mono text-2xs text-muted-foreground">
                        {account.tiktok_bc_id ?? "—"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <TypeBadge type={account.type} />
                    </TableCell>

                    <TableCell className="hidden text-right text-xs sm:table-cell">
                      <MetricValue muted>
                        {formatNumber(account.creativeCount)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <MetricValue tone="loss">
                        {formatCurrency(account.metrics.adSpend)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <MetricValue tone="profit">
                        {formatCurrency(account.metrics.revenue)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="text-right text-xs font-medium">
                      <MetricValue tone={toneFromValue(account.metrics.profit)}>
                        {formatCurrency(account.metrics.profit)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="text-right text-xs">
                      <MetricValue
                        tone={toneFromThreshold(account.metrics.roas, 1)}
                      >
                        {formatRatio(account.metrics.roas)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="hidden text-right text-xs lg:table-cell">
                      <MetricValue muted>
                        {formatPercent(account.metrics.dropoffPct)}
                      </MetricValue>
                    </TableCell>

                    <TableCell className="text-right">
                      {account.is_active ? (
                        <Badge variant="profit">Active</Badge>
                      ) : (
                        <Badge variant="muted">Inactive</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
