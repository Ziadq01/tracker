import { FilterBar } from "@/components/analytics/filter-bar";
import { ConnectionNotice } from "@/components/connection-notice";
import { MetricValue, StatusBadge } from "@/components/metric-value";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatPeriodLabel, resolveRange } from "@/lib/date-ranges";
import { formatCurrency, formatRatio } from "@/lib/metrics";
import { getBcAccounts } from "@/lib/queries";
import { profitTone } from "@/lib/tone-rules";

export const dynamic = "force-dynamic";

export const metadata = { title: "BC Accounts" };

export default async function BcAccountsPage({
  searchParams,
}: {
  searchParams: { range?: string; from?: string; to?: string };
}) {
  const range = resolveRange(searchParams);

  // getBcAccounts already rolls spend/revenue/profit up from runs joined
  // through creatives, so no extra read is needed here.
  const { data: accounts, error } = await getBcAccounts(range);

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
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">ROAS</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="max-w-[18rem]">
                    <span className="block truncate text-[13px] text-foreground">
                      {account.name}
                    </span>
                    <span className="block truncate font-mono text-2xs text-secondary">
                      {account.tiktok_bc_id ?? "No BC ID"}
                    </span>
                  </TableCell>

                  {/* All three roll up every campaign on this account. */}
                  <TableCell className="text-right text-xs">
                    <MetricValue>
                      {formatCurrency(account.metrics.adSpend)}
                    </MetricValue>
                  </TableCell>

                  <TableCell className="text-right text-xs">
                    <MetricValue>
                      {formatCurrency(account.metrics.revenue)}
                    </MetricValue>
                  </TableCell>

                  <TableCell className="text-right text-xs">
                    <MetricValue tone={profitTone(account.metrics.profit)}>
                      {formatCurrency(account.metrics.profit)}
                    </MetricValue>
                  </TableCell>

                  <TableCell className="text-right text-xs">
                    <MetricValue>
                      {formatRatio(account.metrics.roas)}
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
