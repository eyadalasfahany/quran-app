# Step 4 — Prayer Notifications

Phase-5 decision D4. Builds on steps 2–3 and the Phase 4 reminder infrastructure (`expo-notifications`).

## Goal
A local notification fires at each enabled prayer time — offline, no account, no push server.

## Scope
1. **`src/features/salah/data/notifications.ts`:**
   - Rolling schedule: for each enabled prayer, schedule the next **8 days** of triggers from the on-device times.
   - Refresh triggers: app foreground, location source/coordinate change, any toggle change, timezone change.
   - Cancellation is total-before-reschedule (idempotent; no duplicates).
   - System default sound; title/body from i18n («حان وقت صلاة الفجر»). No bundled adhan audio (D4; amended by ADR 0047 (proposed), see `docs/plans/adhan-sound.md`).
2. **Toggles:**
   - Per-prayer bell on `PrayerTimeRow` (wired here) — persisted in MMKV (`storageKeys`), same pattern as the daily reminder; default **off**, nothing pre-enabled. *Amended by ADR 0064: unset bells turn on once location is approved or a city is chosen.*
   - Master section in Settings («إشعارات الصلاة») listing the five prayers, mirroring the same toggles.
   - OS permission: requested lazily on first toggle-on, with the Arabic rationale; denied → toggle snaps back with a guidance alert (same pattern as Phase 4 reminders).
3. **Deep link:** tapping a notification opens the الصلاة tab.
4. **Interaction with reminders:** prayer notifications are a separate channel/category from the daily reading reminder; no shared schedule.

## Tests
- Schedule math: exactly 8 future triggers per enabled prayer; past times today excluded; rollover at midnight.
- Refresh: foreground/location/toggle/timezone each trigger exactly one reschedule.
- Permission denied path: toggle reverts, alert shown.
- Toggle persistence across app restart (MMKV).

## Deliverables
- Notifications module + tests; wired `PrayerTimeRow` bell; Settings section; i18n keys; device-verified delivery (exit check).

## Implementation notes (Phase 5, step 4)

Status: done. Delivery was confirmed on a device in the Phase 5 exit check (developer, 6 Nov 2026).

**Shape of the change**
- `salah/data/notifications.ts`: `prayerFireDates` (pure; 8 future times per enabled prayer, from `timesFor`), `syncPrayerNotifications` (cancel every pending notification whose route is `/salah`, then schedule), the serialised `resyncPrayerNotifications` and `resyncPrayerNotificationsIfNeeded`, and `setPrayerBell` (permission on turn-on, then one re-plan).
- `notifications/sync-state.ts`: the day, time-zone and coordinates record, shared with Azkar. `azkar/reminders/resync-state.ts` now delegates to it and keeps its exports.
- `notifications/permission.ts`: `ensureReminderPermission` moved here and re-exported from `reminder-service.ts`, so the Salah data layer does not load the khatma and reader modules.
- `salah/hooks/usePrayerNotificationsSync.ts`: mounted once in `app/_layout.tsx`. It re-plans on launch, on foreground when the record says the day, zone or coordinates moved, and on a Salah location key change.
- `salah/hooks/index.ts` `useBell`: live from MMKV (the Salah row and Settings share it), permission on first turn-on, and the Phase 4 refusal alert on denial.

**Constants and keys:** prayer channel `prayer` (`notifications.channels.prayer`); `PRAYER_ROLLING_DAYS = 8` in `notifications/budget.ts`; route `/salah` is in the deep-link allowlist (exact match); MMKV `salah.notificationsSync`.

**Budget:** 5 prayers × 8 days = 40, plus Azkar 23 and the daily reminder 1 = 64 (`IOS_PENDING_LIMIT`).

**Deviations from the brief:**
- Cancellation scans the OS pending list by route rather than keeping a list of ids in MMKV. The pending list is then the source of truth, and an orphaned id is also cancelled.
- The location trigger is an MMKV value listener on the four Salah location keys. It is coalesced by the sync queue, so a manual city (four writes) causes one re-plan. This avoids editing the Salah location flow.

**Follow-on (step 4b, ADR 0056):** Iqamah offset — global minutes-before-prayer reminder with system default sound; conditional 4-day rolling window when enabled. Brief: `step-04b-iqamah-offset-notifications.md`, plan `docs/plans/iqamah-offset.md`.

**Open items for the developer:**
- The Settings section «إشعارات الصلاة» has no frame in `quran-app-screens.html` (`#Settings` has only «الورد والتذكير»). It reuses the existing `SettingsGroup` and `ToggleRow` tokens. ADR 0010 needs a frame or approval before review.
- A location permission granted while a bell is already on is picked up at the next foreground (no permission-change event is wired).
- Notifications have not been delivered on a device yet (exit check, step 6).
