"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Building2,
  Clapperboard,
  Menu,
  Target,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "War Room", icon: Activity },
  { href: "/creatives", label: "Creatives", icon: Clapperboard },
  { href: "/offers", label: "Offers", icon: Target },
  { href: "/bc-accounts", label: "BC Accounts", icon: Building2 },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  // Close the mobile drawer whenever navigation lands somewhere new.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
        className="fixed left-3 top-3 z-40 flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground lg:hidden"
      >
        <Menu className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="presentation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[13rem] flex-col border-r border-border bg-[#080808] transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" className="group flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-primary text-[0.7rem] font-bold text-primary-foreground">
              A
            </span>
            <span className="text-sm font-semibold tracking-[0.18em] text-foreground">
              ADRIX
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-px bg-border" />

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2 scrollbar-thin">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-primary" />
                )}
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active
                      ? "text-primary"
                      : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border px-3 py-3">
          <div className="flex items-center gap-2 text-2xs text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-profit opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-profit" />
            </span>
            <span className="tnum uppercase tracking-wider">Live</span>
          </div>
        </div>
      </aside>
    </>
  );
}
