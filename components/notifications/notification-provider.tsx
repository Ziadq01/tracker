"use client";

import * as React from "react";

import type { ConversionPulse } from "@/app/api/conversions/route";
import { playNotificationSound } from "@/components/notifications/notification-sound";
import { formatCurrency } from "@/lib/metrics";

const POLL_MS = 30_000;
const TOAST_MS = 4_000;

export type ToastPayload = {
  campaign: string;
  offer: string | null;
  revenue: number;
  conversions?: number;
};

type Toast = ToastPayload & { id: number; leaving: boolean };

type NotificationApi = { notify: (payload: ToastPayload) => void };

const NotificationContext = React.createContext<NotificationApi>({
  notify: () => {},
});

export function useNotifications() {
  return React.useContext(NotificationContext);
}

function shortOffer(name: string | null): string {
  if (!name) return "Unknown";
  return name.split(/\s+/)[0];
}

function sendNativeNotification(payload: ToastPayload) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const body = `${formatCurrency(payload.revenue)} from ${shortOffer(payload.offer)} · ${payload.campaign}`;

  try {
    new Notification("New Conversion!", {
      body,
      icon: "/icon-192.png",
    });
  } catch {
    // Mobile Safari doesn't support new Notification() — SW push handles it
  }
}

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(0);

  React.useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const notify = React.useCallback((payload: ToastPayload) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { ...payload, id, leaving: false }]);

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
    if (document.hidden) {
      sendNativeNotification(payload);
    }
  }, []);

  const notifyRef = React.useRef(notify);
  notifyRef.current = notify;

  React.useEffect(() => {
    let cancelled = false;

    // Shared across every open tab/window of the app, so one conversion can
    // only ever produce one notification no matter how many tabs are polling.
    const TOTAL_KEY = "scaler-conv-notified-total";
    const LOCK_KEY = "scaler-conv-sound-at";
    const MIN_GAP_MS = 15_000;

    const readNum = (key: string): number | null => {
      try {
        const v = localStorage.getItem(key);
        return v === null ? null : Number(v);
      } catch {
        return null;
      }
    };
    const writeNum = (key: string, n: number) => {
      try { localStorage.setItem(key, String(n)); } catch {}
    };

    const poll = async () => {
      try {
        const res = await fetch("/api/conversions", { cache: "no-store" });
        if (!res.ok) return;
        const pulse = (await res.json()) as ConversionPulse;
        if (cancelled || !pulse.configured || pulse.error) return;

        const notified = readNum(TOTAL_KEY);

        if (notified === null) {
          // First run anywhere: record the baseline without notifying.
          writeNum(TOTAL_KEY, pulse.total);
          return;
        }

        // Glitchy totals can dip and recover between polls; only a total we
        // have never notified for counts as a new conversion.
        if (pulse.total > notified && pulse.latest) {
          const lastSoundAt = readNum(LOCK_KEY) ?? 0;
          const now = Date.now();

          // Claim the new total BEFORE notifying — any other tab polling in
          // parallel sees it already claimed and stays silent.
          writeNum(TOTAL_KEY, pulse.total);

          if (now - lastSoundAt >= MIN_GAP_MS) {
            writeNum(LOCK_KEY, now);
            notifyRef.current(pulse.latest);
          }
        }
      } catch {
        // retry next tick
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
              {shortOffer(toast.offer)}
            </span>
            {toast.conversions != null && toast.conversions > 0 && (
              <span className="tnum text-2xs text-secondary">
                ×{toast.conversions}
              </span>
            )}
            <span className="tnum text-xs font-bold text-profit">
              +{formatCurrency(toast.revenue)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
