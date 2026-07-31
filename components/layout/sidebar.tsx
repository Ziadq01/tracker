"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SidebarCollapse } from "@/components/layout/sidebar-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/analytics", label: "Analytics" },
  { href: "/offers", label: "Offers" },
  { href: "/bc-accounts", label: "BC Accounts" },
] as const;

/**
 * Desktop-only navigation rail.
 *
 * Below 768px it is display:none (see .app-sidebar in globals.css) — there is
 * no drawer, no hamburger and no overlay, because mobile is Analytics only.
 * The theme toggle goes with it, which is why mobile is pinned to the dark set
 * in CSS rather than left to a control the user cannot reach.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar fixed inset-y-0 left-0 z-50 w-[12rem] flex-col border-r border-border bg-background">
      {/* Intentionally no wordmark — this space stays empty. Both toggles
          live at the bottom of the rail. */}
      <div className="h-14" />

      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "block border-l-2 px-5 py-2 text-sm transition-colors duration-100",
                active
                  ? "border-foreground font-bold text-foreground"
                  : "border-transparent text-secondary hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 px-5 py-4">
        <ThemeToggle />
        <SidebarCollapse />
      </div>
    </aside>
  );
}
