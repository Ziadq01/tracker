"use client";

/**
 * Notification audio.
 *
 * The default lives at /public/sounds/notification.mp3. A user-supplied
 * replacement is kept in localStorage as a data URL and wins when present.
 *
 * If neither can play — no file dropped in yet, an unsupported codec, or a
 * browser that blocks playback until the page has been interacted with — a
 * short synthesised chime is used instead, so a conversion is never silent.
 */

export const SOUND_STORAGE_KEY = "scaler-notification-sound";
export const DEFAULT_SOUND_URL = "/sounds/notification.mp3";

/** Data URLs are ~33% larger than the file, and localStorage caps near 5MB. */
export const MAX_SOUND_BYTES = 1_000_000;

export function readStoredSound(): string | null {
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeSound(dataUrl: string): boolean {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, dataUrl);
    return true;
  } catch {
    // Quota exceeded, or private browsing.
    return false;
  }
}

export function clearStoredSound() {
  try {
    localStorage.removeItem(SOUND_STORAGE_KEY);
  } catch {
    // Nothing to do — the default is used either way.
  }
}

/**
 * Plays the notification sound. Returns which source actually produced audio,
 * which the settings UI uses to tell the user whether their file works.
 */
export async function playNotificationSound(): Promise<
  "custom" | "default" | "fallback"
> {
  const custom = readStoredSound();

  if (custom) {
    if (await tryPlay(custom)) return "custom";
  }

  if (await tryPlay(DEFAULT_SOUND_URL)) return "default";

  playFallbackChime();
  return "fallback";
}

async function tryPlay(src: string): Promise<boolean> {
  try {
    const audio = new Audio(src);
    audio.volume = 0.5;
    await audio.play();
    return true;
  } catch {
    // Missing file, unsupported codec, or autoplay blocked.
    return false;
  }
}

/**
 * Two short notes through WebAudio. No asset needed, so the feature is
 * testable before any MP3 is added to the project.
 */
function playFallbackChime() {
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return;

    const ctx = new Ctor();
    const now = ctx.currentTime;

    [
      { freq: 880, at: 0 },
      { freq: 1318.5, at: 0.11 },
    ].forEach(({ freq, at }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + at);
      gain.gain.exponentialRampToValueAtTime(0.22, now + at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.18);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + at);
      osc.stop(now + at + 0.2);
    });

    window.setTimeout(() => void ctx.close(), 600);
  } catch {
    // Audio is unavailable; the toast still appears.
  }
}
