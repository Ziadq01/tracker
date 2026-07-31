"use client";

import * as React from "react";

/** The one breakpoint in the app, matching Tailwind's `md:` and globals.css. */
export const MOBILE_QUERY = "(max-width: 767px)";

/**
 * Subscribes to a media query.
 *
 * Starts `false` so the server render and the first client render agree —
 * anything gated on this appears after hydration rather than mismatching. Use
 * it only for behaviour CSS cannot express (whether to mount a subtree, how
 * many months a calendar renders); plain `md:` classes are better for looks.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const list = window.matchMedia(query);
    const sync = () => setMatches(list.matches);
    sync();
    list.addEventListener("change", sync);
    return () => list.removeEventListener("change", sync);
  }, [query]);

  return matches;
}

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}
