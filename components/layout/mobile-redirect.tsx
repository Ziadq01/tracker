"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { useIsMobile } from "@/components/hooks/use-media-query";

/**
 * Sends a phone back to Analytics.
 *
 * Mobile is Analytics only: the nav rail that would link here does not render
 * below 768px, so the sole way to land on Offers or BC Accounts is a typed URL
 * or an old bookmark. The viewport is not knowable on the server, so this has
 * to happen on the client, after mount.
 */
export function MobileRedirect() {
  const isMobile = useIsMobile();
  const router = useRouter();

  React.useEffect(() => {
    if (isMobile) router.replace("/analytics");
  }, [isMobile, router]);

  return null;
}
