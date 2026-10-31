# Step 7 — Azkar reminders

ADR 0031 §7, spec §13. Builds on steps 2, 5 and 6. **A reminder time is the user's preference, never the religious time of the dhikr.** Nothing is enabled by default, and no default time is presented as recommended.

## Shared notification layer (no second system)
Extend `src/features/notifications/`; don't fork it.
- `reminder-deeplink.ts`: accept an allowlist of route prefixes, `['/read/', '/azkar/']`, instead of `/read/` only. Everything else is still ignored. Keep the cold-start de-duplication. Update its tests.
- Reuse `ensureReminderPermission()` from `reminder-service.ts`.
- **Android channel** `azkar` («تذكير الأذكار» / "Azkar reminders"), created once in a shared `channels.ts`. Move the daily reminder's channel creation there too, keeping its id `reminders` and its behaviour.
- **iOS pending-notification budget** is 64. The budget is: daily reminder 1, prayer notifications (Phase 5 step 4) up to 40, Azkar the rest. Azkar prayer-relative reminders keep a rolling window of **4 days**; clock reminders use one repeating trigger. Put the constants (`AZKAR_ROLLING_DAYS = 4`, `IOS_PENDING_LIMIT = 64`) in `src/features/notifications/budget.ts` with a comment, and write a test asserting that five categories, prayer-relative, fit the remaining budget.

## Azkar reminder engine (`src/features/azkar/reminders/`)
- `reminders-repository.ts` (`user.db.azkar_reminders`): `getReminder(targetType, targetKey)`, `listReminders()`, `saveReminder(input)` (upsert by target), `setNotificationIds(id, ids)`, `deleteReminder`. `useAzkarReminder(targetType, targetKey)` via `useLiveQuery`.
- `schedule.ts` (pure):
  - `clockTrigger(clock_time)` → `{ hour, minute }`
  - `prayerRelativeFireDates(reminder, now, coords, days)` → for each day from today: `timesFor(day, coords)[prayer] + offset_minutes`, keeping only dates after `now`, capped at `days` entries
  - Uses `src/features/salah/data/prayer-times.ts` (no second prayer engine). No coordinates → empty list, and the caller reports `needsLocation`.
- `reminder-service.ts`:
  - **`syncAzkarReminders({ now, coords })`:** for every row, cancel its stored `notification_ids` first (idempotent), then schedule when `enabled`:
    - `clock` → one repeating trigger (Android `DAILY` on the `azkar` channel, iOS `CALENDAR` repeats), as the daily reminder does
    - `prayer_relative` → one `DATE` trigger per fire date
    - Save the new ids.
  - **Content:**
    - title: `azkar.reminders.notificationTitle` with the category name («أذكار الصباح»)
    - body: `azkar.reminders.notificationBody`, neutral: «تذكيرك الذي اخترته» / "Your chosen reminder"
    - `data.route = /azkar/category/<categoryId>`, or `/azkar/entry/<entryKey>` for entry reminders
  - Records `storageKeys.azkar.remindersSync` in MMKV: `{ day: 'YYYY-MM-DD', timeZone: Intl…resolvedOptions().timeZone, coordsKey }`.
- **`needsAzkarResync(previous, current)`** (pure): true when the date, time zone or coordinates key changed. This covers DST: the day and `timesFor` change.
- **When it runs:**
  1. app start in `app/_layout.tsx`, next to `syncDailyReminder`
  2. every return to `active` (`AppState`) when `needsAzkarResync` says so
  3. after any reminder save or toggle
  4. after a Salah location change: call it where `setManualLocation` / `setAutoLocation` are called from the UI (`LocationPickerSheet`), not inside the data functions
  - A changed calculation basis is covered because `timesFor` is recomputed on every sync.
- **Permission:** asked only when a toggle turns on. Denied → the toggle reverts and the same alert pattern as `DailyReminderRow` shows (Arabic copy with a Settings link).

## UI (frame `AzkarReminders`, `AzkarRemindersDenied`)
- `app/azkar/reminders.tsx` as a sheet (`sheetScreenOptions`), param `category?`.
- Components in `src/features/azkar/components/`, each with its colocated test:
  - `AzkarReminderRow`: ToggleRow plus the expanded configuration
  - `ReminderTriggerPicker`: segmented «وقت محدد · بعد صلاة»
  - `PrayerOffsetPicker`: prayer chips plus an offset stepper of 0–120 min in 5-minute steps
  - `ReminderDisclaimer`: «وقت التذكير من اختيارك، وليس وقتًا محددًا للذكر»
  - reuse `ReminderTimeSheet` from Settings for the clock time
- Rows: the five session categories. The category screen's bell opens the sheet for that category. An entry reminder (clock only) is reachable from the reader's details sheet: «تذكير بهذا الذكر».
- **Settings:** a «تذكير الأذكار» ListRow in `HabitsSection` that opens the sheet, shown only when `hasAzkarContent`.
- **No location** with a prayer-relative choice: an inline notice «حدّد موقعك في الصلاة لاستخدام هذا الخيار» with a button to `/salah`.

## Tests
- `prayerRelativeFireDates`: offsets, past times skipped, the rolling window, a DST change (`Europe/London`, 2026-10-25), no coordinates
- `syncAzkarReminders`: cancels before scheduling (no duplicates across two syncs), clock vs prayer-relative trigger shapes, ids persisted, disabled rows cancelled
- `needsAzkarResync` for date, time zone and coordinates
- the deep-link allowlist (`/azkar/` opens, others are ignored)
- the budget test
- component tests (render, toggle, permission-denied revert, RTL/LTR, accessibility labels, the disclaimer always visible)
