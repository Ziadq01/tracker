"use client";

import { usePathname } from "next/navigation";

/**
 * Fades page content in on every route change.
 *
 * Keyed on the pathname so React remounts the subtree and the CSS animation
 * replays; without the key the class would only fire on first mount.
 */
export function PageFade({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="animate-page">
      {children}
    </div>
  );
}
