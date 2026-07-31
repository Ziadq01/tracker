import { FilterBar } from "@/components/analytics/filter-bar";
import { ConnectionNotice } from "@/components/connection-notice";
import { MetricValue, StatusBadge } from "@/components/metric-value";
import {
  STICKY_COL,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resolveRange } from "@/lib/date-ranges";
import { formatCurrency, formatRatio } from "@/lib/metrics";
import { getBcAccounts } from "@/lib/queries";
import { profitTone } from "@/lib/tone-rules";
import { cn } from "@/lib/utils";

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
      />

      <div className="flex-1 space-y-6 px-4 py-6 md:px-6">
        <ConnectionNotice error={error} />

        {accounts.length === 0 ? (
          <p className="border-t border-border py-12 text-center text-xs text-secondary">
            No business center accounts yet.
          </p>
        ) : (
          <Table className="min-w-[40rem] md:min-w-0">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {/* Sticky so the account name survives a scroll right. */}
                <TableHead className={cn(STICKY_COL, "min-w-[10rem]")}>
                  Account
                </TableHead>
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
                  <TableCell
                    className={cn(STICKY_COL, "min-w-[10rem] max-w-[18rem]")}
                  >
                    <span className="block truncate text-xs text-foreground md:text-[13px]">
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
