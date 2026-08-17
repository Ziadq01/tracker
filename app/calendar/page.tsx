"use client";

import * as React from "react";

import { DayDetail } from "@/components/calendar/day-detail";
import { SidebarReveal } from "@/components/layout/sidebar-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import type { CalendarMonth } from "@/app/api/glitchy/calendar/route";
import { formatCurrency, formatNumber } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + delta, 1));
}

export default function CalendarPage() {
  const [month, setMonth] = React.useState(() => monthKey(new Date()));
  const [data, setData] = React.useState<CalendarMonth | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [openDay, setOpenDay] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const res = await fetch(`/api/glitchy/calendar?month=${month}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as CalendarMonth;
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch {
        // keep previous data
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [month]);

  const byDate = React.useMemo(() => {
    const map: Record<string, { revenue: number; clicks: number; conversions: number }> = {};
    for (const d of data?.days ?? []) map[d.date] = d;
    return map;
  }, [data]);

  const maxRevenue = React.useMemo(
    () => Math.max(0, ...(data?.days ?? []).map((d) => d.revenue)),
    [data]
  );

  const [year, monthNum] = month.split("-").map(Number);
  const firstWeekday = new Date(year, monthNum - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const todayKey = new Date().toISOString().slice(0, 10);

  const convRate =
    data && data.totalClicks > 0
      ? (data.totalConversions / data.totalClicks) * 100
      : null;

  return (
    <div className="flex min-h-screen flex-col">
      <SidebarReveal />
      <div className="topmost-bar flex-1 space-y-6 pb-6 pr-4 md:py-6 md:pr-6">
        {/* Header: month nav + earnings */}
        <section className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded border border-border text-secondary transition-colors hover:text-foreground"
            >
              ‹
            </button>
            <h1 className="min-w-[9rem] text-center text-sm font-bold text-foreground">
              {monthLabel(month)}
            </h1>
            <button
              type="button"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded border border-border text-secondary transition-colors hover:text-foreground"
            >
              ›
            </button>
          </div>

          <span className="tnum text-lg font-bold text-profit">
            {formatCurrency(data?.totalRevenue ?? 0)}
          </span>
        </section>

        {/* Month stats */}
        <section className="grid grid-cols-2 gap-4 border-y border-border py-4 md:grid-cols-5">
          <HeaderStat
            label="Month earnings"
            value={formatCurrency(data?.totalRevenue ?? 0)}
            highlight
          />
          <HeaderStat
            label="Total clicks"
            value={formatNumber(data?.totalClicks ?? 0)}
          />
          <HeaderStat
            label="Conversions"
            value={formatNumber(data?.totalConversions ?? 0)}
          />
          <HeaderStat
            label="Conv. rate"
            value={convRate !== null ? `${convRate.toFixed(2)}%` : "—"}
          />
          <HeaderStat
            label="EPC"
            value={
              data && data.totalClicks > 0
                ? formatCurrency(data.totalRevenue / data.totalClicks)
                : "—"
            }
          />
        </section>

        {/* Calendar grid */}
        {loading ? (
          <Skeleton className="h-[24rem]" />
        ) : (
          <section>
            <div className="grid grid-cols-7 gap-1.5 md:gap-2">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="pb-1 text-center text-2xs uppercase tracking-header text-secondary"
                >
                  {d}
                </div>
              ))}

              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateKey = `${month}-${String(dayNum).padStart(2, "0")}`;
                const day = byDate[dateKey];
                const revenue = day?.revenue ?? 0;
                const isToday = dateKey === todayKey;
                const isFuture = dateKey > todayKey;

                // Brightness scales with the day's share of the best day.
                const intensity =
                  maxRevenue > 0 && revenue > 0
                    ? 0.25 + 0.75 * (revenue / maxRevenue)
                    : 0;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    // Future days hold nothing to drill into.
                    disabled={isFuture}
                    onClick={() => setOpenDay(dateKey)}
                    title={revenue > 0 ? "View this day's breakdown" : undefined}
                    className={cn(
                      "flex aspect-square flex-col justify-between rounded-md border p-1.5 text-left transition-opacity md:aspect-[4/3] md:p-2",
                      revenue > 0
                        ? "border-transparent"
                        : "border-border bg-background",
                      isToday && "ring-1 ring-foreground",
                      isFuture ? "cursor-default opacity-35" : "hover:opacity-80"
                    )}
                    style={
                      revenue > 0
                        ? { backgroundColor: `rgba(34, 197, 94, ${intensity})` }
                        : undefined
                    }
                  >
                    <span
                      className={cn(
                        "text-xs",
                        revenue > 0
                          ? "font-semibold text-white"
                          : "text-secondary"
                      )}
                    >
                      {dayNum}
                    </span>
                    {revenue > 0 && (
                      <span className="tnum truncate text-xs font-bold text-white md:text-base">
                        {formatCurrency(revenue)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {data?.days.length === 0 && (
              <p className="py-8 text-center text-xs text-secondary">
                No saved data for this month yet — data builds up day by day
                from when the tracker started saving.
              </p>
            )}
          </section>
        )}
      </div>

      {openDay && (
        <DayDetail date={openDay} onClose={() => setOpenDay(null)} />
      )}
    </div>
  );
}

function HeaderStat({
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
