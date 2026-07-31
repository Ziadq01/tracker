"use client";

import * as React from "react";

import {
  MAX_SOUND_BYTES,
  clearStoredSound,
  playNotificationSound,
  readStoredSound,
  storeSound,
} from "@/components/notifications/notification-sound";

/**
 * Replaces the conversion sound with any MP3.
 *
 * The file is held in localStorage as a data URL, so it is per-browser and
 * needs no upload endpoint or storage bucket. That also sets the ceiling:
 * localStorage runs out around 5MB and base64 inflates a file by a third, so
 * anything past ~1MB is refused rather than silently failing to save.
 */
export function SoundPicker() {
  const [hasCustom, setHasCustom] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setHasCustom(readStoredSound() !== null);
  }, []);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    setStatus(null);

    if (!file.type.startsWith("audio/")) {
      setStatus("That is not an audio file.");
      return;
    }
    if (file.size > MAX_SOUND_BYTES) {
      setStatus(
        `Too large — ${(file.size / 1_000_000).toFixed(1)}MB. Keep it under 1MB.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      if (storeSound(dataUrl)) {
        setHasCustom(true);
        setStatus(`Using ${file.name}.`);
      } else {
        setStatus("Could not save — browser storage is full.");
      }
    };
    reader.onerror = () => setStatus("Could not read that file.");
    reader.readAsDataURL(file);
  };

  return (
    <section className="border-t border-border pt-4">
      <h2 className="text-xs font-bold text-foreground md:text-[13px]">
        Conversion sound
      </h2>
      <p className="mt-1 text-2xs leading-relaxed text-secondary">
        Plays when new network clicks land. Stored in this browser only. Leave it
        unset to use the default at{" "}
        <code className="bg-surface px-1 font-mono">
          /sounds/notification.mp3
        </code>
        .
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <input
          ref={inputRef}
          type="file"
          accept="audio/mpeg,audio/*"
          className="sr-only"
          onChange={(event) => onFile(event.target.files?.[0])}
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-[44px] items-center border border-foreground px-3 text-2xs text-foreground transition-opacity hover:opacity-70 md:min-h-0 md:py-1"
        >
          {hasCustom ? "Replace MP3" : "Upload MP3"}
        </button>

        <button
          type="button"
          onClick={async () => {
            const used = await playNotificationSound();
            setStatus(
              used === "custom"
                ? "Played your uploaded sound."
                : used === "default"
                  ? "Played the default sound."
                  : "No sound file found — played the built-in chime."
            );
          }}
          className="inline-flex min-h-[44px] items-center text-2xs text-secondary underline-offset-4 transition-colors hover:text-foreground hover:underline md:min-h-0"
        >
          Preview
        </button>

        {hasCustom && (
          <button
            type="button"
            onClick={() => {
              clearStoredSound();
              setHasCustom(false);
              setStatus("Reverted to the default sound.");
            }}
            className="inline-flex min-h-[44px] items-center text-2xs text-secondary underline-offset-4 transition-colors hover:text-loss hover:underline md:min-h-0"
          >
            Reset
          </button>
        )}
      </div>

      {status && (
        <p role="status" className="mt-2 text-2xs text-secondary">
          {status}
        </p>
      )}
    </section>
  );
}
