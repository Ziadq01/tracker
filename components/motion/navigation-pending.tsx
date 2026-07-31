"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Shares one transition's pending state between the filter bar (which starts
 * the navigation) and the figures that should dim while new data is fetched.
 *
 * This is what makes a real fade-*out* possible. Keying content on the search
 * params would only ever fade the new value in — the old one would vanish
 * instantly, because React has already swapped it.
 */
type Ctx = {
  isPending: boolean;
  startNavigation: (action: () => void) => void;
};

const NavigationContext = React.createContext<Ctx>({
  isPending: false,
  startNavigation: (action) => action(),
});

export function NavigationPendingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isPending, startTransition] = React.useTransition();

  const startNavigation = React.useCallback(
    (action: () => void) => startTransition(action),
    []
  );

  const value = React.useMemo(
    () => ({ isPending, startNavigation }),
    [isPending, startNavigation]
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return React.useContext(NavigationContext);
}

/**
 * Dims its children while a navigation is in flight, so changing the date
 * range reads as fade out -> fade in rather than a hard swap.
 */
export function FadeOnPending({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isPending } = useNavigation();

  return (
    <div
      className={cn(
        "transition-opacity duration-150 ease-out",
        isPending && "opacity-0",
        className
      )}
    >
      {children}
    </div>
  );
}
