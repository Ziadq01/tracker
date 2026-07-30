"use client";

import * as React from "react";

import { THEME_STORAGE_KEY } from "@/components/layout/shell-init";

export function ThemeToggle() {
  // Starts light on the server, then syncs to whatever the inline shell script
  // already decided. Reading the DOM during render would mismatch on hydration.
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing — the toggle still works for this session.
    }
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={mounted ? isDark : undefined}
      aria-label="Dark mode"
      onClick={toggle}
      className="relative inline-flex h-4 w-7 shrink-0 items-center border border-border transition-colors"
      style={{ backgroundColor: isDark ? "var(--text)" : "transparent" }}
    >
      <span
        className="pointer-events-none block h-2.5 w-2.5 transition-transform"
        style={{
          backgroundColor: isDark ? "var(--bg)" : "var(--secondary)",
          transform: isDark ? "translateX(15px)" : "translateX(2px)",
        }}
      />
    </button>
  );
}
