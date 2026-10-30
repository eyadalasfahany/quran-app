# Step 4 — Local Reading Reminders

Spec §13, §15, ADR 0027.

## Goal
Implement scheduled local daily notifications on the device using `expo-notifications` (without remote APNs/FCM servers or cloud accounts).

## Scope
1. **Dependency:**
   - Verify `expo-notifications` installation and configuration in `app.json`.
2. **Notification Service:**
   - Request system notification permissions when user enables daily reminders in Settings.
   - Schedule recurring daily local notification at the user's selected time (e.g. 08:00 or after Maghrib).
   - Cancel scheduled notifications when the reminder toggle is disabled.
3. **Notification Content & Interaction:**
   - Localized notification title and body: e.g. «وردك اليومي» / «حان وقت قراءة وردك من القرآن الكريم».
   - Tapping the notification deep-links the user directly to the app reader at their current reading position or active Khatma goal.
4. **Settings UI:**
   - In `SettingsScreen`, under "الورد والتذكير":
     - Toggle switch for daily reminder.
     - When active, displays the selected reminder time with time picker modal to adjust it.

## Deliverables
- Notification utility/service in `apps/mobile/src/features/notifications/`.
- Unit tests mocking `expo-notifications`.
- UI controls wired into `SettingsScreen`.
- i18n keys in `ar.json` and `en.json`.

## Implementation brief (30 Oct 2026)

Recon is done; build exactly this.

**Dependencies and config**
- `npx expo install expo-notifications` (version-table pin ~58.1.6).
- `npx expo install @react-native-community/datetimepicker` for the time picker. It is NOT in the content-plan version table — add a row for it there in the same change (active releases, SDK-compatible via expo install). The reviewer flags it to the developer before commit.
- `app.config.ts` `plugins`: add `'expo-notifications'` (default options; no custom icon or sounds).
- After merge the developer rebuilds the dev client (`npx expo run:ios`) — new native module.

**What exists already (don't rebuild)**
- `src/features/settings/reminder-preference.ts`: MMKV bool `dailyReminder`.
- `HabitsSection` toggle in Settings, wired in `SettingsScreen` (`handleReminderChange`).
- i18n `settings.reminders.{dailyReminder,khatma,khatmaValue}`.
- Khatma daily target: `dailyTarget()` and `progress.todayTarget` (`src/features/khatma/`).
- Reading anchor: `useReadingAnchor` (`src/features/reader/anchor/`), route `/read/[verseKey]`.

**Service — `src/features/notifications/`**
- `reminder-service.ts`:
  - `ensureReminderPermission(): Promise<boolean>` — `requestPermissionsAsync`; true when granted.
  - `syncDailyReminder(): Promise<void>` — reads the preference (enabled + time, MMKV keys `dailyReminderTime` default `'21:00'` and `dailyReminderNotificationId`, add to `storageKeys`), cancels the previously scheduled id, and when enabled schedules one DAILY trigger at the stored time:
    - Title «وردك اليومي» / "Your daily wird" (`notifications.reminder.title`).
    - Body: with an active khatma plan, «وِردك اليوم: ٤ صفحات» reusing the existing `khatma.pagesPerDay` plural key with `count: todayTarget`; without a plan, `notifications.reminder.body` («حان وقت قراءة وردك من القرآن الكريم» / "Time to read your daily wird of the Quran"). Read the plan at schedule time; fall back to the generic body on any failure.
    - `data: { route }` where route is `/read/<lastVerseKey>` from the reading anchor storage; `/` when none.
  - Android: create a `reminders` channel (`setNotificationChannelAsync`, IMPORTANCE_DEFAULT) before scheduling; iOS needs none.
- `reminder-deeplink.ts`: `registerReminderDeepLinks(router)` — `addNotificationResponseReceivedListener` pushes `data.route` with Expo Router; also handle cold start via `getLastNotificationResponseAsync()`. Wired once from `app/_layout.tsx`.
- Reschedule (spec §13) on: toggle on/off, time change, app bootstrap (one effect in `app/_layout.tsx` calling `syncDailyReminder()` — covers timezone and plan changes), and after a khatma plan is created or edited (call from the Khatma save path).

**Settings UI**
- When the toggle is ON, the row gains the onboarding frame's subtitle: «كل يوم ٩:٠٠ م» / "Every day 9:00 PM" (`settings.reminders.everyDayAt`, locale-formatted time). Extend `ToggleRow` with an optional `subtitle` prop (with tests) — the `#Settings`/onboarding frame draws the subtitle inside the row.
- Tapping the row while ON opens the time picker: iOS — a modal sheet with the datetimepicker spinner and «تم»/«إلغاء»; Android — the datetimepicker dialog. Saving writes `dailyReminderTime` and reschedules.
- Toggle ON flow: `ensureReminderPermission()` → granted: persist, schedule, show subtitle. Denied: stay OFF and alert (`settings.reminders.permissionDenied{Title,Body,openSettings}`) with a button that calls `Linking.openSettings()`.

**Tests (mock `expo-notifications` and `@react-native-community/datetimepicker`)**
- Service: schedules at the stored time with the right title/body/route; cancels when disabled; plan body vs generic body; reschedule replaces the old id; Android channel created.
- Toggle: permission granted → on + schedule; denied → stays off + alert.
- Row: subtitle visible when on with the formatted time; hidden when off; RTL in ar and en.
- Time save writes the key and reschedules.

**Docs:** content-plan version-table row for datetimepicker. After review, the orchestrator marks step 4 in `docs/plans/phase-4/README.md`.

**Non-goals:** push notifications, the separate khatma reminder, quiet hours (server-side), the onboarding screen's reminder toggle.

**Gate:** `cd apps/mobile && npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`.

## Implementation notes (30 Oct 2026)

Built as specced, with these decisions on record:

- **Time picker is an inline expansion, not a modal sheet.** The brief above said "iOS — a modal sheet". No frame in `quran-app-screens.html` covers this picker; the built `ReminderTimeSheet` expands the spinner inline under the row with «تم»/«إلغاء», the iOS Settings pattern, drawn from tokens. **Developer sign-off needed** — the modal variant is recoverable if rejected.
- `formatTime(date, locale)` added to `src/core/i18n/dates.ts` («٩:٠٠ م» / "9:00 PM"), same ICU-plus-arabize pattern as `formatDate`.
- Route payload validated before navigating: only `/read/...` is accepted; the cold-start double delivery (listener + `getLastNotificationResponseAsync`) is swallowed with a 2-second window so a later tap on the repeating notification still opens.
- jest.setup gained global mocks for `expo-notifications` and `@react-native-community/datetimepicker` (a View stand-in that keeps props reachable, so tests can fire `change` and inspect `value`).
- **Jest lesson recorded for future steps:** after a state-changing `fireEvent`, assert with `await findBy*` / `waitFor`, never a sync `getBy*` — React 19 concurrent rendering does not flush the update synchronously (KhatmaScreen's tests already follow this).
- `expo-notifications` (~58.1.7) and `@react-native-community/datetimepicker` (9.2.1) added to `apps/mobile`; content-plan pin corrected (the subagent had written `~7.6.2`). **New dependency needs developer approval before commit.**
- Gate: lint 0 errors, tsc clean, jest 279/279 suites (2766 tests) green. `expo-doctor` fails on a **pre-existing** react-native duplication (root `0.88.1` vs mobile `0.88.0`, present at HEAD) — not from this step; aligning it touches the Nitro patch (ADR 0016) and is left to the developer.
- A dev-client rebuild (`npx expo run:ios`) is required: `expo-notifications` adds a native module.

