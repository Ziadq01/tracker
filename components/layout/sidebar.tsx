"use client";

import * as React from "react";
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

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape closes, and the page behind the overlay must not scroll while it is
  // open — on a phone that reads as the drawer being broken.
  React.useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      {/* Hamburger, top left. 44px square so it is a comfortable tap target,
          and fixed so it stays reachable as the page scrolls. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="fixed left-1 top-1 z-40 inline-flex h-[44px] w-[44px] items-center justify-center text-secondary transition-colors hover:text-foreground md:hidden"
      >
        <svg
          aria-hidden
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Tapping anywhere outside the panel closes it. */}
      {open && (
        <div
          role="presentation"
          onClick={() => setOpen(false)}
          className="animate-fade fixed inset-0 z-40 bg-[var(--scrim)] md:hidden"
        />
      )}

      <aside
        data-mobile-open={open}
        className={cn(
          "app-sidebar fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-background",
          // ~80% of the viewport as an overlay on mobile, a fixed rail at md.
          "w-4/5 max-w-[320px] md:w-[12rem] md:max-w-none"
        )}
      >
        {/* Intentionally no wordmark — this space stays empty. Both toggles
            live at the bottom of the rail. */}
        <div className="flex h-14 items-center justify-end px-2 md:px-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="inline-flex h-[44px] w-[44px] items-center justify-center text-secondary transition-colors hover:text-foreground md:hidden"
          >
            <svg
              aria-hidden
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  // min-h keeps each row a 44px tap target on a phone.
                  "flex min-h-[44px] items-center border-l-2 px-5 text-sm transition-colors duration-100 md:block md:min-h-0 md:py-2",
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

        {/* Both toggles stay in the drawer on mobile. Collapse is desktop-only
            — an overlay is already dismissed by the close control above and by
            tapping outside — so the theme switch is the one that matters on a
            phone, and it is reachable here from the hamburger. */}
        <div className="flex items-center gap-3 px-5 py-4">
          <ThemeToggle />
          <SidebarCollapse />
        </div>
      </aside>
    </>
  );
}
