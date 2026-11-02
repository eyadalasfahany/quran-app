# Plan: selectable adhan sound for prayer notifications

Status: draft; developer answers recorded 2026-11-02 (B, C, E, picker place, branch). Branch: `main` (developer, 2 Nov 2026). ADR 0047 accepted (2 Nov 2026).

## Rests on

- ADR 0030 §3 Sound (the rule this changes), `docs/plans/phase-5.md` D4, `docs/plans/phase-5/step-04-prayer-notifications.md`.
- `docs/adr/0047-selectable-adhan-notification-sound.md` (accepted 2 Nov 2026).
- Spec §13 Notifications (edited), §4 (responsive layout), §14 (testing), `docs/content-plan.md` (Adhan audio section, new; Notifications).
- ADR 0010 (frame before UI), ADR 0046 (current ayah; a preview must not touch it), ADR 0031 §7 (shared notification layer), root `CLAUDE.md` non-negotiables 4, 5, 6, 7.
- Code read: `apps/mobile/src/features/salah/data/notifications.ts`, `features/notifications/channels.ts`, `features/notifications/budget.ts`, `features/settings/components/PrayerNotificationsSection.tsx`, `features/reader/screens/SourcesScreen.tsx`, `app.config.ts` (plain `'expo-notifications'` plugin entry), `core/storage/mmkv.ts` (`storageKeys.salah.*`).

## Findings

- No notification sets `sound` (prayer, Azkar, daily reminder). Checked in expo-notifications 58 (`ios/.../NotificationRecords.swift`): an absent `sound` plays the default on iOS, so they are not silent. Step 1 makes it explicit. Verified strings: iOS content `sound` = file name with extension, `false` = silent; Android channel `sound` = file name (the extension is stripped, `SoundResolver.kt`), `null` = silent.
- `scheduleSettings()` is the re-plan key; `resyncPrayerNotificationsIfNeeded` already re-plans when it changes, so the voice joins it.
- `cancelPrayerNotifications` finds prayer items by `data.route === '/salah'`, so the voice change cancels and reschedules cleanly.
- iOS budget (40 prayer slots) is unaffected by sound.
- Facts to verify in step 2 (from memory of the platform docs, not read from a file here): iOS accepts aiff, wav, caf only, 30 s max; Android reads `res/raw`, lowercase `[a-z0-9_]` names, and (Android 8+) the sound comes from the channel, not the notification; the expo-notifications plugin `sounds` option copies the same files to both platforms; the sound-in-content field takes the file name with extension.

## Decisions

| # | Decision | Recommendation |
| --- | --- | --- |
| A | Full adhan in-app (on tap or app open) | Out of scope. Cheap only if it reuses a streamed file, which breaks offline and licensing; defer to its own ADR. |
| B | Options | **Decided (developer, 2 Nov 2026):** adhan voices (3 for now: `allahu_akbar_short`, `makkah`, `madinah`), system sound, and Silent. **Default: `allahu_akbar_short`.** |
| C | Clip content and Fajr | **Decided (developer, 2 Nov 2026):** each voice's clip is the opening takbīr «الله أكبر» only, the same clip for all five prayers. No Fajr variant, so «الصلاة خير من النوم» never appears. |
| D | Scope of choice | One global voice for all five prayers. |
| E | Preview vs Quran audio | **Decided (developer, 2 Nov 2026):** preview pauses Quran playback and does not resume it. It stops on leaving the screen, on picking another voice and at the clip's end. It never writes `playerStore`, the current ayah or recent listens. |
| F | Android channels | Keep `prayer` = system sound. Since the default is an adhan voice, existing users move to `prayer_adhan_allahu_akbar_short` on the first sync; their Android tweaks to `prayer` apply only if they pick the system sound. Add `prayer_adhan_<id>` per voice, created only for the selected voice. `prayer_silent` for silent. Delete channels of voices removed from the catalogue. Never change a channel's sound; a re-recorded voice gets a new id. |
| G | Azkar and daily reminder | Stay on the system default sound. |
| H | Format and size | **Decided (developer, 2 Nov 2026):** 5 voices, clips of 5 to 6 s, shipped as 16-bit PCM WAV, mono, 22.05 kHz (iOS rejects mp3 as a notification sound; Android plays WAV), so one file set serves both and no plugin wrapper is needed. About 260 KB per clip, about 1.3 MB total. The developer's mp3 sources are converted with `afconvert -f WAVE -d LEI16@22050 -c 1`. Step 2 confirms on devices. Earlier analysis: A takbīr-only clip (C) is short (roughly 10 to 20 s), well under the iOS 30 s cap; PCM at 30 s mono 22 kHz 16-bit is about 1.3 MB, so 5 clips may still need IMA4 CAF on iOS and a compressed format (ogg) on Android. The plugin copies one file set to both platforms, so a platform-split needs a small config-plugin wrapper. If the size target cannot be met, report it to the developer. |
| I | Where the picker lives | **Decided (developer, 2 Nov 2026):** in Settings («إشعارات الصلاة») and on the Salah screen. Both open the same picker and read the same setting. |

## Decisions that need the developer (listed, not decided)

1. Licensing: which recordings, and commissioned vs found. Written permission for commissioned ones. NC licences are accepted (the app earns no money, developer 2 Nov 2026); ND licences stay excluded.
2. Religious check: someone listens to every clip and confirms it is a complete takbīr «الله أكبر», not cut mid-word. No religious text is generated.
3. Cutting a native build per voice-list change (accepted by choosing this feature).
6. ADR 0047 itself: it replaces an accepted ADR's rule.

## Steps

Each step is a small, separately reviewable change. Tests are written with the step (spec §14).

1. **Default sound now (no ADR needed; within ADR 0030).** Set `sound: 'default'` in prayer, Azkar and daily-reminder content; Android channels unchanged.
   - Tests: content of each category has `sound: 'default'` (extend `notifications.test.ts` and the Azkar and reminder tests); no change to counts or triggers.
   - Gate: on-device check that an iOS notification now sounds (a real build; simulator does not play).
2. **Spike: format, size, plugin, preview source.** Use one placeholder test tone (not a recording; licence-free, generated, marked as a fixture). Measure iOS CAF/WAV and Android ogg/wav sizes, confirm the `sounds` plugin copies and that Android raw names work, confirm `sound` and channel `sound` strings, and whether `expo-audio` can preview the native resource without a second copy in the bundle. Output: a short note appended to this plan with numbers, and decision H. No shipped code.
   - Gate: developer reads the note.
3. **Frame (ADR 0010).** Draw in `quran-app-screens.html` from existing tokens, then get approval. It must show:
   - the picker inside the «إشعارات الصلاة» settings group and its entry on the Salah screen (decision I) (RTL, light and dark): rows for each voice (default first), System sound (Arabic name, short Arabic descriptor of the muezzin/place only if licensed), Silent;
   - the selected state (check), per-row preview play/stop button, playing state with progress, and a pressed state;
   - a note row explaining the sound plays only when the phone is not on silent;
   - the expanded-window (sidebar) layout and a long-name wrap;
   - the disabled/empty state when no prayer bell is on (picker still changeable) and the permission-denied state;
   - the credits entry on Sources (a «أصوات الأذان» row and its detail list).
   - Gate: frame approved. UI steps do not start before.
4. **Voice catalogue and setting (data only).** `features/salah/data/adhan-voices.ts` (ids, file names, i18n keys; ids lowercase `[a-z0-9_]`), `storageKeys.salah.adhanVoice`, getter/setter, default `allahu_akbar_short`. Unknown stored id falls back to `allahu_akbar_short`. Voice id added to `scheduleSettings()`.
   - Tests: default; round trip; unknown id fallback; changing it flips `scheduleSettings()` and makes `resyncPrayerNotificationsIfNeeded` re-plan; id regex check across the catalogue.
5. **Scheduling with the voice.** `prayerNotificationContent(prayer, voice)` sets `sound` (file name, `'default'`, or none for silent); `prayerTrigger` picks the channel. Unit tests with the catalogue stubbed.
   - Tests: per option, content `sound` and trigger `channelId` (android) are right; iOS has no channelId; the schedule count is unchanged (budget); changing the voice cancels and re-plans exactly once and leaves no old-sound item pending (the existing route-based cancel).
6. **Android channel management.** `channels.ts`: `ensureNotificationChannel` takes the voice's channel id and `sound`; `prayer` unchanged; `prayer_silent`; `pruneAdhanChannels()` deletes `prayer_adhan_*` channels not in the catalogue (channels of catalogue voices that are not selected are kept, so a user's system-level channel settings survive switching back).
   - Tests: mocked `setNotificationChannelAsync` and `getNotificationChannelsAsync`: creates only the selected voice's channel; never recreates with a different sound; `prayer` is untouched; prune removes only unknown `prayer_adhan_*`; iOS no-op; channel names from i18n ar/en.
7. **Plugin and assets (needs recordings; blocked by release blocker 1).** Add the clips under `apps/mobile/assets/adhan/`, add `sounds` to the `'expo-notifications'` plugin in `app.config.ts`, and check the runtime/fingerprint so an OTA update cannot reference a sound the installed binary lacks.
   - Tests: a Jest test reading `app.config.ts` that every catalogue file is listed in `sounds`, exists, and matches the name regex; a size budget script (total at or under the target from H) run in CI.
   - Gate: native build (EAS dev build), on-device check on iPhone and an Android device: each voice plays at the prayer time, silent is silent, switching voices takes effect for the next notification, and a 30-s limit holds.
8. **Preview service.** `features/salah/data/adhan-preview.ts` with its own `expo-audio` player; pauses Quran playback through the existing player store action (read the store before coding); stops on unmount, on voice change and on end.
   - Tests: starts and stops; pauses Quran audio and does not resume; never changes `reader.lastVerseKey`, `playerStore` current item or recent listens; ends cleanly on error.
9. **Picker UI.** Own-file components with colocated tests, per the frontend rule: `AdhanVoiceRow`, `AdhanVoiceList`, composed in `PrayerNotificationsSection` and on the Salah screen (decision I). Uses `useTheme()` and `useWindowClass()`, i18n keys in `ar.json` and `en.json` (voice names, descriptors, a11y labels, silent note).
   - Tests per component: render, selected and playing variants, press selects and re-plans (mock `resyncPrayerNotifications`), preview toggles, RTL layout (row order and check side), accessibility (`radio` role with selected state, label naming the voice, preview button label «تشغيل المعاينة», hint), i18n ar/en keys present, expanded window.
   - Review: compare with the approved frame, iPhone 17 simulator screenshot against `frame-shot.py`, per `CLAUDE.md`.
10. **Credits and licence rows.** One row in `docs/content-plan.md` per file (the section exists), one credit entry on `SourcesScreen` (and `SourcesScreen.test.tsx`), i18n ar/en. Test: every catalogue voice has a credit key.
11. **Exit check.** `composer qa` not needed (no API); mobile checks: `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`; device check from step 7; frame match; ADR 0047 status set to accepted; spec and ADR 0030 note finalised.

Steps 1 and 2 can start now. Steps 4 to 6 can be built with a placeholder catalogue. Steps 7 and 10 need real recordings.

## Test matrix (spec §14 style)

| Area | Where |
| --- | --- |
| Scheduling (`sound`, `channelId`, counts, budget) | steps 1, 5 |
| Channel create, no re-create, prune, migration of `prayer` | step 6 |
| Settings re-plan on change | steps 4, 5, 9 |
| i18n ar/en parity | steps 6, 9, 10 |
| RTL, accessibility, expanded window | step 9 |
| Bundled files vs config, size budget | step 7 |
| Preview vs Quran audio | step 8 |
| On-device delivery (iOS and Android) | steps 1, 7 |

## Release blockers

1. ~~Recordings chosen, each with a stated licence or written permission~~ **Waived by the developer for the first three clips (2 Nov 2026)**; see the content plan, Adhan audio. Credits on the Sources screen wait for known sources.
2. A content reviewer (or the developer) has listened to every clip: a complete takbīr «الله أكبر», no cut mid-word.
3. Frame approved (ADR 0010).
4. ADR 0047 accepted by the developer.
5. Size target met or the developer accepts the measured size.
6. On-device delivery verified on iOS and Android (not simulator).
7. An EAS native build exists; the feature is not shippable by OTA.

## Open questions

Answered 2 Nov 2026: 5 voices, clips 5 to 6 s, WAV (H); commissioned recordings, the developer arranges permission and trimming; ADR 0047 accepted; Silent yes (B); takbīr-only clip, no Fajr variant (C); preview pauses Quran audio (E); picker in Settings and on the Salah screen (I); branch `main`; the app earns no money, so NC licences are accepted.

1. Voice display names (ar/en) and credit text for each of the 5 recordings, for the content-plan table.
2. Should this ship before the Phase 5 exit check on a real device, given step 1 needs that same device check?
