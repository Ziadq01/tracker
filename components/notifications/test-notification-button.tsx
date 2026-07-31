"use client";

import { useNotifications } from "@/components/notifications/notification-provider";

/**
 * Fires a toast and the notification sound with fabricated data.
 *
 * Deliberately quiet — bottom of the page, muted grey, no border — so it does
 * not read as a feature. It exists because the real trigger needs a conversion
 * to actually land, which is not something you can arrange while checking that
 * the sound file and the toast work.
 */
export function TestNotificationButton() {
  const { notify } = useNotifications();

  return (
    <div className="pt-6 text-center">
      <button
        type="button"
        onClick={() =>
          notify({
            campaign: "Test Campaign",
            offer: "Test Offer",
            revenue: 24.5,
          })
        }
        className="inline-flex min-h-[44px] items-center text-2xs text-nav-muted underline-offset-4 transition-colors hover:text-secondary hover:underline md:min-h-0"
      >
        Test notification
      </button>
    </div>
  );
}
