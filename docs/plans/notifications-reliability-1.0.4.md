# Plan: notification reliability for store build 1.0.4 (ADR 0084)

Status: **planned, not started.** Planned 9 Nov 2026. ADR 0084 is **proposed**; nothing below starts until the developer accepts it.

> **GATE: do not start before the OTA batch is published.** Both items change the native layer, so the runtime fingerprint changes. An `eas update` cut after the first native commit lands on no 1.0.3 install (`apps/mobile/CLAUDE.md`, «Releasing»; `app.config.ts` `runtimeVersion: { policy: 'fingerprint' }`). Order: publish the OTA batch, run `npx eas-cli fingerprint:compare` to record the 1.0.3 fingerprint, then start step 1. Work on a branch or in a clean tree until the batch is out, so no native change is in the tree the OTA is cut from.

## Rests on

- `docs/technical-spec.md` §13 (notifications; lines 761, 762, 763–768), §14 (CI, release).
- ADR 0030 §3 (prayer notifications, rolling window), 0031 §7 (Azkar reminders), 0035 §5 (exact alarms), 0056 (iqamah offset, window of 4 days), 0064 (on by default), 0079 (store release workflow: tag `mobile-v1.0.4`, release notes folder), 0082 (alarm-clock delivery, accepted).
- ADR 0083 (Android 14/7-day prayer window, "renew" reminder): **did not exist when this plan was written.** Read it before step 1; items marked (0083) below depend on it.
- `docs/content-plan.md` line 49 (version table, `expo-notifications ~58.1.7`), the 12-month release rule, §Notifications (line 378).
- Code: `apps/mobile/src/features/salah/data/notifications.ts`, `.../hooks/usePrayerNotificationsSync.ts`, `.../data/location.ts`, `apps/mobile/src/features/azkar/reminders/{resync,reminder-service,last-known-coordinates}.ts`, `apps/mobile/src/features/notifications/{budget,channels,permission,sync-state}.ts`, `apps/mobile/app.config.ts`, `apps/mobile/index.ts`.

## Findings that shape the plan

1. **Package.** `expo-background-task` latest is **58.0.12**, published **31 Oct 2026** (created Jan 2025; MIT; peer `expo: *`; depends on `expo-task-manager ~58.0.13`, published 31 Oct 2026). Both are inside the 12-month rule. Neither is installed yet.
2. **Plugin (read from the 58.0.12 tarball).** `expo-background-task`'s config plugin adds `processing` to `UIBackgroundModes` and `com.expo.modules.backgroundtask.processing` to `BGTaskSchedulerPermittedIdentifiers`. The Android manifest is empty (WorkManager 2.10.5 comes with the library). `app.config.ts` already sets `UIBackgroundModes: ['audio']`; the plugin pushes into that array, so the result must hold both. Verify on prebuild (step 4).
3. **API (tarball `build/BackgroundTask.d.ts`).** `registerTaskAsync(name, { minimumInterval })` (minutes; default 12 h; minimum 15; inexact, "short intervals are often ignored" on iOS), `unregisterTaskAsync`, `getStatusAsync`, `triggerTaskWorkerForTestingAsync` (debug builds only), `addExpirationListener` (iOS). The task body is registered with `TaskManager.defineTask` from `expo-task-manager`, and returns `BackgroundTaskResult.Success | Failed`.
4. **expo-notifications 58.1.8** (`node_modules/expo-notifications/build/Notifications.types.d.ts`): `interruptionLevel?: 'passive' | 'active' | 'timeSensitive' | 'critical'` is on `NotificationContentInput` (line 630, `@platform ios`). Supported; no upgrade needed.
5. **Existing re-plan code is mostly reusable.** `resyncPrayerNotificationsIfNeeded` already re-plans on a new day, reads only the last known position when the settings did not move (`lastKnownOnly`), and runs on the serialized queue. `resyncAzkarRemindersIfNeeded` likewise uses `readLastKnownCoordinates`. Neither prompts.
6. **A real hazard in the background.** `getCoordinates({ lastKnownOnly: true })` returns a position only if it is under `LAST_KNOWN_MAX_AGE_MS` = 24 h old (`location.ts` line 37), and Android and iOS may refuse location to a background launch with a foreground-only permission. A null result reaches `syncPrayerNotifications`, which **cancels every pending prayer notification first** and plans none (`notifications.ts`, `cancelPrayerNotifications` before `prayerFireDates`). In the foreground that is rare and self-heals at the next launch; in the background it would silence a user who is not looking. Step 2 closes this.
7. **Headless context.** MMKV (`quran-prefs`) is a native module in the same process, so reads and writes work with no extra setup. `i18n` is initialised by importing `@/core/i18n` (notification text); `getLocale` reads MMKV. The widget task entry (`src/features/widgets/android/entry.ts`, imported first in `index.ts`) is the precedent for top-level registration that runs in a headless launch.
8. **Platform limits.** iOS: opportunistic, may never run for an app the user has not opened; not available in the Simulator (BGTaskScheduler needs a device). Android: WorkManager periodic work (15-minute floor), deferred by Doze, App Standby buckets and OEM killers; a force-stop cancels it.

## Decisions that need the developer

Nothing here is decided. Defaults are the plan's proposal.

1. **Accept ADR 0084** (status proposed) and confirm 1.0.4 as the build that carries both items.
2. **Interval.** Default proposed: `minimumInterval: 12 * 60` (the library default, twice a day). "About daily" would be `24 * 60`; a shorter one costs battery for no gain, since the re-plan only acts when the day moves.
3. **Persisted coordinates (step 2).** Done in the OTA batch (ADR 0083 amendment, 9 Nov 2026): the fallback reads the coordinates of the last sync through `coordsFromKey` on the existing sync state. No new MMKV key.
4. **Time-Sensitive scope.** Proposed: adhan and iqamah only. Azkar, daily, goals, Friday and misbaha stay "active".
5. **Apple capability.** Someone with the Apple Developer account must confirm "Time Sensitive Notifications" is enabled on the App ID `com.taybahapp.taybah` (EAS can enable it during a build only if credentials are synced interactively; the CI build is non-interactive, ADR 0079). Developer action, not an agent action.
6. **App Review wording** for the processing background mode and Time-Sensitive (step 9): the developer approves the text before submission.
7. **Goal and Friday reminders.** The Friday «dhuhr» mode and goal reminders have their own sync state (`reminders.goalsSync`, `storageKeys.reminders`). This plan covers prayer and Azkar only, as asked. Say if the background task should include them; I did not read `features/reminders` for this plan.
8. **ADR 0083 interplay (0083).** If 0083 moves iOS to a window other than 8/4 days, or changes `resyncPrayerNotificationsIfNeeded`, steps 2 and 3 are rebased on it. Confirm 0083 is implemented (or ordered before) first.

## Steps

Each step is one reviewable change. Implementation goes to a Haiku subagent with a brief; the orchestrator reviews the diff. No step commits. Mobile gate after every step: `npm run lint && npx tsc --noEmit && npm test` in `apps/mobile`. Steps 1, 4 and 5 touch native config, so they also run `npx expo-doctor`.

### Step 0 — Gate and baseline (no code)

- Confirm the OTA batch is published and the production channel serves it.
- Run `npx eas-cli fingerprint:compare`; save the 1.0.3 fingerprint in the PR notes.
- Read ADR 0083 final text; reconcile with this plan; developer accepts ADR 0084.
- Output: go/no-go. No tests.

### Step 1 — Install the packages

- `cd apps/mobile && npx expo install expo-background-task expo-task-manager` (never plain `npm install`).
- Expected versions: `~58.0.12` and `~58.0.13`. Check the lockfile diff touches nothing else.
- `docs/content-plan.md`: add two rows after line 49 (version, release date 31 Oct 2026, MIT, purpose). Status line: native, 1.0.4 only.
- Gates: `node .github/scripts/npm-audit.mjs`, `npx expo-doctor`. An advisory with no fix goes to `.github/audit-allowlist.json` only with the developer's agreement.
- Tests: none new; the full suite must still pass (Jest may need `jest.mock('expo-task-manager')` in a shared setup if import fails; handle here).

### Step 2 — Make the prayer re-plan safe without a location (code + tests)

Status: done in the OTA batch (ADR 0083 amendment, 9 Nov 2026), via `coordsFromKey` on the existing sync state. The new key and the background variant below are not built; the background task (ADR 0084) plans its own change.

Files: `salah/data/notifications.ts`, `notifications/sync-state.ts` (`coordsFromKey`), colocated tests. No `core/storage/mmkv.ts` change.

- Superseded: no new key. The last sync's coordinates already live in the sync state (`coordsKey`), read through `coordsFromKey`.
- Add `resyncPrayerNotificationsInBackground(now)`: same serialized queue; reads coordinates in this order: manual city, last known position (any age, no fix), the stored key. **If none is found, return without cancelling or planning.** Never call `ensureReminderPermission`, `armDefaultPrayerBells` or the exact-alarm prompt. Only acts when `previous` state shows the day or time zone moved, or the stored sync state is missing (same test as the foreground function).
- Reuse `syncPrayerNotifications`; do not fork its body. Keep the foreground function unchanged.
- Tests (`notifications.test.ts`): no coordinates anywhere leaves scheduled notifications untouched (`cancelScheduledNotificationAsync` not called); stored fallback is used and plans; manual city wins; the same day and zone does nothing; no prompt functions are called; a throw is logged and resolves false; two concurrent calls run one after the other (queue).

### Step 3 — Azkar background re-plan check (code + tests)

Files: `azkar/reminders/resync.ts`, `resync.test.ts`.

- `resyncAzkarRemindersIfNeeded` already reads `readLastKnownCoordinates` and never asks for a fix. Confirm that with a test named for the background case, and make it fall back to the stored coordinates from step 2 when a prayer-relative reminder exists and the last known position is null. Guard the same hazard: with prayer-relative reminders and no coordinates, do not let `syncAzkarReminders` unschedule them.
- Read `reminder-service.ts` `syncAzkarReminders` first to see what it does with null coordinates; if it already keeps or reports "unscheduled" without cancelling, the change is test-only.
- Tests: null coordinates keep existing notification ids; clock reminders re-plan with no location; no live reminders returns false without reading location.

### Step 4 — The task and its registration (code + tests + native config)

Files (each its own file, colocated tests):

- `src/features/notifications/background-replan.ts`: `runBackgroundReplan(now = new Date())` → runs prayer then Azkar, each in its own try/catch, and returns `BackgroundTaskResult.Success` unless both threw (`Failed`). Writes one MMKV key `notifications.backgroundReplan` = `{ at: ISO, prayer: boolean, azkar: boolean }` for diagnosis (no UI).
- `src/features/notifications/background-task.ts`: `export const BACKGROUND_REPLAN_TASK = 'taybah-background-replan'`; `TaskManager.defineTask(BACKGROUND_REPLAN_TASK, runBackgroundReplan)` at module top level (a task defined inside a component or after launch is not found by a headless start); `registerBackgroundReplan()` that calls `getStatusAsync`, skips if `Restricted`, skips if `TaskManager.isTaskRegisteredAsync` is true (avoid resetting the schedule on every launch), else `registerTaskAsync(name, { minimumInterval })`; `unregisterBackgroundReplan()`.
- `apps/mobile/index.ts`: add `import '@/features/notifications/background-task';` as the second import (after the widgets entry, before `expo-router/entry`).
- `usePrayerNotificationsSync` (or a sibling hook mounted next to it): after the launch re-plan, call `registerBackgroundReplan()` when a prayer bell is on or a live Azkar reminder exists, else `unregisterBackgroundReplan()`; also on bell toggle. Keep it in one place to stay reviewable.
- `app.config.ts`: add `'expo-background-task'` to `plugins`, with a comment (ADR 0084). Do not add Info.plist keys by hand.
- Native config check without a build: `APP_VARIANT=production npx expo prebuild --no-install --platform ios` into a throw-away copy (never in the working tree; it must not leave `ios/` behind) and confirm `UIBackgroundModes` = `audio` + `processing`, and the identifier is permitted. Then `npx expo config --type introspect` as an alternative. Record the result in the PR.
- Tests: `background-replan.test.ts` (mocks for the two resync functions: both run in order; one throwing still runs the other and returns Success; both throwing returns Failed; the diagnostic key is written); `background-task.test.ts` (defineTask called once with the name at import; register skipped when restricted and when already registered; registered with the chosen interval otherwise; unregister); hook test (registers when a bell is on, unregisters when none). Mock `expo-background-task` and `expo-task-manager`.

### Step 5 — Time-Sensitive content and entitlement (code + tests + native config)

Files: `salah/data/notifications.ts` (and its test), `app.config.ts`.

- `prayerNotificationContent` and `iqamahNotificationContent` add `interruptionLevel: 'timeSensitive'` on iOS only (`Platform.OS === 'ios'`, the same pattern as `prayerTrigger`), so the Android payload is unchanged and ADR 0082 tests stay valid. Extend the two content interfaces.
- `app.config.ts` `ios.entitlements`: add `'com.apple.developer.usernotifications.time-sensitive': true` beside the App Group. The `.dev` variant carries it too (same code path); the dev App ID also needs the capability, or the dev build fails to sign. Alternative if that is a problem: set it only for `production`. Decide in step 0 with the developer.
- Tests: iOS content has `interruptionLevel: 'timeSensitive'` for all five prayers and iqamah; Android content has no such key; an Azkar/daily reminder content has none (the azkar `reminderContent` test).
- Do not apply to Friday, goals, misbaha, daily.

### Step 6 — Spec, runbook and release notes (docs)

- Spec edits listed below; `docs/runbooks/store-release.md` gets a line on the Apple capability check.
- `infra/store-release/release-notes/1.0.4/{ar,en}.txt`: written by the developer or approved by them (limit 500 characters, no platform or store names, no Quran script, `release-notes-check.mjs`). Do not invent claims such as "prayer times arrive on time even if the app is closed" that the platform may not honour.
- ADR 0084 status to accepted; ADR 0083 cross-links.

### Step 7 — Build and verify (developer, with agent help)

- Bump `version` to `1.0.4` in `app.config.ts`; push tag `mobile-v1.0.4` (ADR 0079 workflow). The developer does the tag; agents do not commit or push.
- Run the verification below on a development build first (EAS `development` profile or local), then on the TestFlight / internal-track build before release.

### Step 8 — App Review notes (developer approves)

Text for App Store Connect «Notes for review» (English; no religious text):

- Background mode «Background processing» is used once or twice a day to recompute the next days of local prayer-time notifications from the device's saved city or last known position. It makes no network request and shows no UI.
- «Time Sensitive Notifications» is used only for the adhan and iqamah notifications at the exact prayer time. They are time-bound events the user chose to be reminded of (a per-prayer switch in the app). No promotional or marketing notification uses it.
- Location: the app does not request background location.

Also check the Privacy nutrition label: no change expected (location is on-device only), but confirm with the stored coordinates in step 2.

## Spec lines that will change (with the implementation, not now)

`docs/technical-spec.md`:

- Line 761 («Prayer notifications default», ADR 0064): no change.
- After line 762 («Prayer delivery on Android», ADR 0082): add **«Background re-plan (ADR 0084)»**: a background task (`expo-background-task`, WorkManager and BGTaskScheduler) runs about every 12 hours, re-plans prayer and Azkar notifications with the saved city, last known position or last synced coordinates, never prompts, never fixes GPS, and never cancels when no location is found; iOS runs it opportunistically.
- After that: add **«Time-Sensitive prayers on iOS (ADR 0084)»**: adhan and iqamah use `interruptionLevel: 'timeSensitive'` with the entitlement; other notifications stay active.
- Line 767 («resync on launch, on foreground when the day, time zone or coordinates key changed, and on any edit»): append «, and from the background task».
- Line 763 (Azkar reminders): rolling 8-day text; unchanged unless ADR 0083 changes the window.
- Line 768: nothing.
- §14: if CI lists the native gates, no change; the fingerprint note in `apps/mobile/CLAUDE.md` is unchanged.
- `docs/content-plan.md` after line 49: two rows (step 1); §Notifications (line 378): one sentence on the background task and Time-Sensitive.
- `apps/mobile/app.config.ts` comments only.

## Verification

Android (physical device preferred; emulator for a first run)

1. Install the dev or release build; turn on one bell; open the app once; `adb shell dumpsys jobscheduler | grep -A8 taybah` and `adb shell dumpsys activity service SystemJobService | grep taybah` to find the WorkManager job.
2. Make the re-plan act: set the device date forward one day (turn off automatic time, change the date, restore it after), or clear `salah.notificationsSync` in a debug build.
3. Force the job: `adb shell cmd jobscheduler run -f com.taybahapp.taybah <jobId>`. Debug builds can call `triggerTaskWorkerForTestingAsync()`.
4. Expect: logcat shows the headless task starting; the MMKV diagnostic key shows a fresh `at`; `adb shell dumpsys alarm | grep taybah` shows new alarms; with the app killed and no location available, the pending alarms are unchanged (step 2 guard).
5. Doze: `adb shell dumpsys deviceidle force-idle`, repeat 3, record that the job is deferred; unforce. Force-stop the app and confirm the task does not run (known limit).

iOS (real device only; BGTaskScheduler is unavailable in the Simulator)

1. Install a development or TestFlight build; turn on a bell; background the app.
2. Attach Xcode, pause, and run in the debugger: `e -l objc -- (void)[[BGTaskScheduler sharedScheduler] _simulateLaunchForTaskWithIdentifier:@"com.expo.modules.backgroundtask.processing"]`, then resume.
3. Expect: the diagnostic key is fresh and pending notifications are re-planned (`getAllScheduledNotificationsAsync` in a debug screen or log).
4. Time-Sensitive: schedule a prayer a minute out with a Focus (Do Not Disturb) on, with Taybah allowed in Focus off; the notification must present. In Settings > Notifications > Taybah, the «Time Sensitive Notifications» switch must exist (it appears only if the entitlement is in the signed build). Turn it off and confirm the notification behaves as active (held by Focus).
5. Check the signed app: `codesign -d --entitlements :- Taybah.app` lists `com.apple.developer.usernotifications.time-sensitive`.

Both: `npx eas-cli fingerprint:compare` shows the 1.0.4 build differs from 1.0.3 and an OTA cut after 1.0.4 targets 1.0.4 builds only.

## Release blockers

- RB-N1. OTA batch not yet published (the gate above).
- RB-N2. Apple App ID lacks Time Sensitive Notifications, or the provisioning profile does not carry it (build fails or entitlement missing at runtime). Developer action in the Apple Developer portal.
- RB-N3. Step 2's guard not in place: a background run with no location could silence all prayer notifications. Must not ship without it and its test.
- RB-N4. Android: the headless task throws at start (a top-level import needing UI or a missing mock). Must pass the real-device check.
- RB-N5. `UIBackgroundModes` loses `audio` after the plugin runs (reader audio in the background would break). Check in the prebuild result.
- RB-N6. ADR 0084 (and 0083) not accepted; release notes for 1.0.4 not approved.
- RB-N7. iOS background launch not verified on a real device. Not a blocker for shipping if it works on Android; but the 1.0.4 notes and the app must not promise it on iOS.

## Risks

- iOS may rarely or never run the task for a rarely opened app. Mitigation: ADR 0083 renew reminder stays; the notes make no promise.
- Each headless run loads the whole bundle (widgets entry and `expo-router/entry`). If the cold start in the background is heavy or crashes on an import with UI side effects, the task fails silently. Mitigation: step 4 device check; Sentry sees the crash (spec §13 Monitoring).
- A `registerTaskAsync` on every launch could reset WorkManager's schedule and starve the task; the `isTaskRegisteredAsync` guard avoids it.
- Storing coordinates (step 2) is a small privacy surface; kept to 2 decimals and cleared with personal data.
- The first build with an entitlement can fail credentials sync in the non-interactive CI (ADR 0079 notes the first run is untested anyway). Keep a manual `eas build` fallback.
- Background Android work can run while the OS has revoked notification permission: `scheduleNotificationAsync` then no-ops; the task must not crash on it (covered by the throw test in step 4).
