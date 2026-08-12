"use client";

import { SoundPicker } from "@/components/notifications/sound-picker";

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen flex-col px-4 py-6 md:px-6">
      <h1 className="text-xs font-bold text-foreground md:text-[13px]">
        Settings
      </h1>
      <div className="mt-6">
        <SoundPicker />
      </div>
    </div>
  );
}
