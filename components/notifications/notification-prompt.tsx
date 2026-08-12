"use client";

import * as React from "react";

const DISMISSED_KEY = "notification-prompt-dismissed";

export function NotificationPrompt() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "default") return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    setVisible(true);
  }, []);

  if (!visible) return null;

  const handleEnable = async () => {
    const result = await Notification.requestPermission();
    if (result === "granted" || result === "denied") {
      localStorage.setItem(DISMISSED_KEY, "1");
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="flex items-center justify-between gap-4 border-b border-border bg-background px-4 py-2 md:px-6">
      <p className="text-2xs text-secondary">
        Enable notifications to get alerted on new conversions
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={handleEnable}
          className="text-2xs font-bold text-foreground underline-offset-4 hover:underline"
        >
          Enable
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-2xs text-secondary underline-offset-4 hover:underline"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
