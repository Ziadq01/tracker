"use client";

import * as React from "react";

const THRESHOLD = 80;
const MAX_PULL = 120;

function isPwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

export function usePullToRefresh(onRefresh: () => Promise<void> | void) {
  const [pullDistance, setPullDistance] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const startY = React.useRef(0);
  const pulling = React.useRef(false);

  React.useEffect(() => {
    if (!isPwa()) return;

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta < 0) {
        pulling.current = false;
        setPullDistance(0);
        return;
      }
      const clamped = Math.min(delta * 0.5, MAX_PULL);
      setPullDistance(clamped);
      if (clamped > 10) e.preventDefault();
    };

    const onTouchEnd = async () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullDistance >= THRESHOLD) {
        setRefreshing(true);
        setPullDistance(0);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
        }
      } else {
        setPullDistance(0);
      }
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh, pullDistance]);

  return { pullDistance, refreshing };
}

export function PullToRefreshIndicator({
  pullDistance,
  refreshing,
}: {
  pullDistance: number;
  refreshing: boolean;
}) {
  if (pullDistance === 0 && !refreshing) return null;

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const ready = progress >= 1;

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[height] duration-150"
      style={{ height: refreshing ? 40 : pullDistance > 0 ? pullDistance * 0.5 : 0 }}
    >
      <div
        className={`h-5 w-5 rounded-full border-2 border-secondary ${
          refreshing ? "animate-spin border-t-foreground" : ""
        }`}
        style={{
          opacity: refreshing ? 1 : progress,
          transform: `rotate(${pullDistance * 3}deg) scale(${ready ? 1 : 0.7 + progress * 0.3})`,
          borderTopColor: ready && !refreshing ? "var(--foreground)" : undefined,
        }}
      />
    </div>
  );
}
