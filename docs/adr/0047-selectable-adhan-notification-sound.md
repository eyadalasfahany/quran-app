# 0047 — The user picks an adhan voice for prayer notifications

Date: 2026-11-02 · Status: **Accepted** (developer, 2 Nov 2026) · Amends ADR 0030 §3 (Sound) and §Consequences (the "no custom Adhan audio" gap), `docs/plans/phase-5.md` D4, `docs/plans/phase-5/step-04-prayer-notifications.md`, spec §13 and the content plan (Notifications). Plan: `docs/plans/adhan-sound.md`.

## Context

ADR 0030 §3 fixed prayer notifications to the system sound and bundled no adhan audio, for app size and licensing. The code today sets no `sound` on any local notification (`apps/mobile/src/features/salah/data/notifications.ts`), and the channels in `apps/mobile/src/features/notifications/channels.ts` set none either. (Checked in expo-notifications 58 source, `NotificationRecords.swift`: on iOS an absent `sound` plays the default, so today's notifications do sound; content now sets the sound explicitly.) Users want to hear a call to prayer. Two facts shape the design:

- iOS plays a custom notification sound only if the file is inside the app bundle, is aiff, wav or caf, and is 30 seconds or shorter; a longer file falls back to the default. The expo-notifications config plugin (`sounds: [...]`) bundles the files, so adding or changing a voice needs a native build, never an OTA update.
- Android fixes a channel's sound when the channel is created. A different sound needs a different channel id. Raw resource names must be lowercase `[a-z0-9_]`.

## Decision

1. **The user chooses the prayer notification sound** from: a small catalogue of adhan voices (3 for now: `allahu_akbar_short`, `makkah`, `madinah`; up to about 5), the system sound, and silent (developer, 2 Nov 2026). **The default is the `allahu_akbar_short` voice** (developer, 2 Nov 2026), so a new install hears the takbīr without opening the picker. The choice is one global setting for all five prayers (no per-prayer voice). The picker is reachable from Settings («إشعارات الصلاة») and from the Salah screen; both edit the same setting.
2. **Each voice's clip is the opening takbīr «الله أكبر» only** (developer, 2 Nov 2026), the same clip for every prayer, and 30 seconds or less. It is not the full adhan, and there is no Fajr variant, so «الصلاة خير من النوم» is never played. The full adhan playing in-app (on tap, or with the app open) is **out of scope** for this change. A later ADR may add it.
3. **iOS:** the voice's file name goes in the notification content `sound`. "System default" sets `sound: 'default'`. "Silent" sets no sound.
4. **Android:** one channel per voice, `prayer_adhan_<id>`, created lazily when that voice is selected. The existing `prayer` channel stays and means "system sound". Because the default is now an adhan voice, everyone moves to `prayer_adhan_allahu_akbar_short` on the first sync after this ships; Android-level tweaks a user made to the old `prayer` channel apply again only if they pick the system sound. A silent channel `prayer_silent` (no sound). Channels for voices that leave the catalogue are deleted on the next sync. A channel is never recreated with a changed sound; a replaced recording gets a new id.
5. **Changing the voice re-plans every pending prayer notification** at once: the voice id joins `scheduleSettings()`, and each scheduled item carries the `sound` (content) and the voice's `channelId` (trigger).
6. **Azkar and daily reminders** keep the system default sound (`sound: 'default'`), unaffected by the voice. This default-sound fix ships first, on its own, within ADR 0030 as written (plan step 1).
7. **Preview:** the picker has a play button per voice that plays the bundled clip with `expo-audio`. A preview pauses Quran playback and does not resume it (developer, 2 Nov 2026). A preview never writes `playerStore` state, the current ayah (ADR 0046) or recent listens.
8. **Licensing:** a recording ships only with a recorded licence and, for commissioned recordings, written permission. Each file has a row in `docs/content-plan.md` (source, licence, credit) and a credit on the Sources screen. Sources and rules are in the content plan (Adhan audio). Excluded: any ND licence such as CC BY-NC-ND (trimming is a derivative), and well-known Haram or Alafasy recordings. NC licences are accepted because the app earns no money (developer, 2 Nov 2026); if that changes, NC clips are replaced first.
9. **Format and size:** clips are 5 to 6 seconds (developer, 2 Nov 2026), stored as 16-bit linear PCM WAV, mono, 22.05 kHz: the one format both iOS (aiff/wav/caf, no mp3) and Android notification sounds play, so one file set serves both. Five clips come to about 1.3 MB or less, within the 2 MB target. Source files from the developer are mp3 and are converted, not shipped.
10. **Design:** a frame in `quran-app-screens.html`, drawn from existing tokens, is approved before any UI code (ADR 0010).

## Consequences

- Positive: the notification actually sounds on iOS (step 1), and users get a recognisable adhan offline with no network, no account and no server work.
- Negative: the binary grows; every change to the voice list is a native build; five more Android channels can appear in system settings (only the selected one is created, others are not); iOS sound plays only when the ringer and Focus allow it, which the app cannot change.
- Risk: preview in JS may need the clip as a Metro asset as well as a native resource, which could double its size on iOS. Plan step 2 measures this.
- Release blockers: the frame must be approved (developer approved it in advance, 2 Nov 2026). The licence and permission requirement was waived by the developer for the first three clips (2 Nov 2026), with the risk recorded in the content plan; later voices follow the content-plan rules.
- Unchanged: the iOS pending budget (`budget.ts`), the 8-day rolling schedule, prayer-time calculation, and non-negotiables 1 to 8. No religious text is generated; the clips are human recordings.

## Alternatives considered

- Keep "no adhan audio" (ADR 0030). Rejected as proposed: it leaves iOS silent and gives the developer's requested feature no home.
- Full-length adhan as the notification sound. Not possible on iOS (30 s cap).
- Per-prayer voices, or a separate Fajr clip («الصلاة خير من النوم»). Rejected: the clip is the takbīr only, which is the same for every prayer (developer, 2 Nov 2026).
- Stream the clips from our API. Rejected: a notification sound must be in the binary, and the app must work offline.
