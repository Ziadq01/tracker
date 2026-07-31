"use client";

import { SIDEBAR_STORAGE_KEY } from "@/components/layout/shell-init";

function setCollapsed(collapsed: boolean) {
  document.documentElement.classList.toggle("sidebar-collapsed", collapsed);
  try {
    localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      collapsed ? "collapsed" : "expanded"
    );
  } catch {
    // Private browsing — still works for this session.
  }
}

/** Sits in the sidebar. Collapses it and widens the content to full width. */
export function SidebarCollapse() {
  return (
    <button
      type="button"
      onClick={() => setCollapsed(true)}
      aria-label="Hide sidebar"
      title="Hide sidebar"
      className="hidden h-6 w-6 items-center justify-center text-secondary transition-colors hover:text-foreground lg:inline-flex"
    >
      <Chevron direction="left" />
    </button>
  );
}

/**
 * Sits in the main area and only appears once the sidebar is collapsed. Pinned
 * to the bottom-left so it lands where the collapse control was, and so nothing
 * sits at the top of the rail.
 */
export function SidebarReveal() {
  return (
    <button
      type="button"
      onClick={() => setCollapsed(false)}
      aria-label="Show sidebar"
      title="Show sidebar"
      className="sidebar-reveal fixed bottom-4 left-3 z-40 h-6 w-6 items-center justify-center text-secondary transition-colors hover:text-foreground"
    >
      <Chevron direction="right" />
    </button>
  );
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {direction === "left" ? (
        <polyline points="15 18 9 12 15 6" />
      ) : (
        <polyline points="9 18 15 12 9 6" />
      )}
    </svg>
  );
}
