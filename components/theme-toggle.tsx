"use client";

import * as React from "react";

const STORAGE_KEY = "adrix-theme";

/**
 * Runs before first paint so the stored theme is applied without a flash of the
 * wrong one. Kept as a string because it has to be inlined into <head>.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var dark = stored
      ? stored === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

function getInitialTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function ThemeToggle() {
  // Start light on the server, then sync to whatever the inline script decided.
  // Reading the DOM during render would mismatch during hydration.
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setTheme(getInitialTheme());
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem(STORAGE_KEY, next);
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
      className="group relative inline-flex h-4 w-7 shrink-0 items-center border border-border transition-colors"
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
