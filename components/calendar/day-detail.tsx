"use client";

import * as React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type {
  DayBreakdown,
  DayBreakdownRow,
} from "@/app/api/glitchy/day/route";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const DASH = "—";

function longDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function DayDetail({
  date,
  onClose,
}: {
  date: string;
  onClose: () => void;
}) {
  const [data, setData] = React.useState<DayBreakdown | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);

    (async () => {
      try {
        const res = await fetch(`/api/glitchy/day?date=${date}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as DayBreakdown;
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date]);

  // Escape closes, matching the dismiss affordance of the backdrop.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 md:items-center md:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Breakdown for ${longDate(date)}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-xl border border-border bg-background p-5 md:rounded-xl md:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-2xs uppercase tracking-header text-secondary">
              Day breakdown
            </p>
            <h2 className="mt-1 truncate text-sm font-bold text-foreground">
              {longDate(date)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-border text-secondary transition-colors hover:text-foreground"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="mt-5 space-y-4">
            <Skeleton className="h-[4rem]" />
            <Skeleton className="h-[10rem]" />
          </div>
        ) : !data || data.totalClicks === 0 ? (
          <p className="py-12 text-center text-xs text-secondary">
            No saved data for this day.
          </p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-4 border-y border-border py-4 md:grid-cols-5">
              <Stat
                label="Revenue"
                value={formatCurrency(data.totalRevenue)}
                highlight
              />
              <Stat label="Clicks" value={formatNumber(data.totalClicks)} />
              <Stat
                label="Convs"
                value={formatNumber(data.totalConversions)}
              />
              <Stat
                label="CVR"
                value={data.cvr !== null ? formatPercent(data.cvr) : DASH}
              />
              <Stat
                label="EPC"
                value={data.epc !== null ? formatCurrency(data.epc) : DASH}
              />
            </div>

            <Table title="By source" rows={data.sources} />
            <Table title="By offer" rows={data.offers} />
          </>
        )}
      </div>
    </div>
  );
}

function Table({
  title,
  rows,
}: {
  title: string;
  rows: DayBreakdownRow[];
}) {
  if (rows.length === 0) return null;

  return (
    <section className="mt-6">
      <p className="text-2xs uppercase tracking-header text-secondary">
        {title}
      </p>

      <div className="scroll-x mt-2">
        <div className="min-w-[32rem]">
          <div className="flex items-center gap-3 border-b border-border py-2 text-2xs uppercase tracking-header text-secondary">
            <div className="min-w-0 flex-1">Name</div>
            <Cell>Rev</Cell>
            <Cell>Clicks</Cell>
            <Cell>Convs</Cell>
            <Cell>CVR</Cell>
            <Cell>EPC</Cell>
          </div>

          {rows.map((row) => (
            <div
              key={row.key}
              className="flex items-center gap-3 border-b border-border py-2.5"
            >
              <div className="min-w-0 flex-1 truncate text-xs font-bold text-foreground">
                {row.label}
              </div>
              <Cell value>{formatCurrency(row.revenue)}</Cell>
              <Cell value>{formatNumber(row.clicks)}</Cell>
              <Cell value>{formatNumber(row.conversions)}</Cell>
              <Cell value>
                {row.cvr !== null ? formatPercent(row.cvr) : DASH}
              </Cell>
              <Cell value>
                {row.epc !== null ? formatCurrency(row.epc) : DASH}
              </Cell>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Cell({
  children,
  value,
}: {
  children: React.ReactNode;
  value?: boolean;
}) {
  return (
    <div
      className={cn(
        "w-[4.5rem] shrink-0 text-right",
        value && "tnum text-xs text-foreground"
      )}
    >
      {children}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-2xs uppercase tracking-header text-secondary">
        {label}
      </p>
      <p
        className={cn(
          "tnum mt-1 text-sm font-bold",
          highlight ? "text-profit" : "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}
