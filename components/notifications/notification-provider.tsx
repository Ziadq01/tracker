"use client";

import * as React from "react";

import type { ConversionPulse } from "@/app/api/conversions/route";
import { playNotificationSound } from "@/components/notifications/notification-sound";
import { formatCurrency } from "@/lib/metrics";

/**
 * Conversion notifications.
 *
 * Polls /api/conversions every 30s and compares the running network_clicks
 * total against the previous reading. An increase means clicks landed, so a
 * toast fades in bottom-right and the notification sound plays.
 *
 * The first poll only establishes the baseline — without that, every page load
 * would announce the entire history as new.
 */

const POLL_MS = 30_000;
const TOAST_MS = 4_000;

export type ToastPayload = {
  campaign: string;
  offer: string | null;
  revenue: number;
};

type Toast = ToastPayload & { id: number; leaving: boolean };

type NotificationApi = { notify: (payload: ToastPayload) => void };

const NotificationContext = React.createContext<NotificationApi>({
  notify: () => {},
});

/** Lets any client component raise a toast — used by the test button. */
export function useNotifications() {
  return React.useContext(NotificationContext);
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(0);

  const notify = React.useCallback((payload: ToastPayload) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { ...payload, id, leaving: false }]);

    // Mark it leaving first so the fade-out runs, then unmount it.
    window.setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
      );
      window.setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        200
      );
    }, TOAST_MS);

    void playNotificationSound();
  }, []);

  // Kept in a ref so the poll effect never re-subscribes.
  const notifyRef = React.useRef(notify);
  notifyRef.current = notify;

  React.useEffect(() => {
    let cancelled = false;
    let lastTotal: number | null = null;

    const poll = async () => {
      try {
        const res = await fetch("/api/conversions", { cache: "no-store" });
        if (!res.ok) return;
        const pulse = (await res.json()) as ConversionPulse;
        if (cancelled || !pulse.configured || pulse.error) return;

        // First reading is the baseline, not an event.
        if (lastTotal !== null && pulse.total > lastTotal && pulse.latest) {
          notifyRef.current(pulse.latest);
        }
        lastTotal = pulse.total;
      } catch {
        // Offline or the route is unreachable; try again next tick.
      }
    };

    void poll();
    const timer = window.setInterval(poll, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <ToastStack toasts={toasts} />
    </NotificationContext.Provider>
  );
}

function ToastStack({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={
            toast.leaving
              ? "animate-toast-out border border-border bg-background px-3 py-2"
              : "animate-toast-in border border-border bg-background px-3 py-2"
          }
        >
          <div className="truncate text-xs font-bold text-foreground">
            {toast.campaign}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="truncate text-2xs text-secondary">
              {toast.offer ?? "No offer"}
            </span>
            <span className="tnum text-xs font-bold text-profit">
              +{formatCurrency(toast.revenue)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
