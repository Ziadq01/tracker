# Notification sound

Drop an MP3 here named **`notification.mp3`**. It plays when the conversion
poller sees `network_clicks` increase, and it is what the "Test notification"
button on Analytics and the "Preview" button on BC Accounts play.

```
public/sounds/notification.mp3
```

Nothing else needs changing — the path is wired in
`components/notifications/notification-sound.ts` as `DEFAULT_SOUND_URL`.

## If the file is missing

Playback falls back to a short synthesised two-note chime through WebAudio, so
the notification is never silent and the feature is testable without an asset.
The Preview button reports which source actually played.

## Per-browser override

BC Accounts has an upload control that stores any MP3 under 1MB in
`localStorage` as a data URL. When one is set it takes precedence over this
file. That override is per browser and needs no server storage; the 1MB ceiling
is there because base64 inflates a file by a third and `localStorage` runs out
around 5MB.
