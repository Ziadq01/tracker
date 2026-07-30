"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "War Room" },
  { href: "/creatives", label: "Creatives" },
  { href: "/offers", label: "Offers" },
  { href: "/bc-accounts", label: "BC Accounts" },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Text trigger — the theme switch is the only icon in the app. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-40 text-2xs uppercase tracking-header text-secondary transition-colors hover:text-foreground lg:hidden"
      >
        Menu
      </button>

      {open && (
        <div
          role="presentation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-foreground/20 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[12rem] flex-col border-r border-border bg-background transition-transform duration-150",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-14 items-center justify-between px-5">
          <Link
            href="/"
            className="text-sm font-bold tracking-header text-foreground"
          >
            ADRIX
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-2xs uppercase tracking-header text-secondary lg:hidden"
          >
            Close
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block border-l-2 px-5 py-2 text-sm transition-colors",
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

        <div className="flex items-center px-5 py-4">
          <ThemeToggle />
        </div>
      </aside>
    </>
  );
}
