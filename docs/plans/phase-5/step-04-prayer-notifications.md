# Step 4 — Prayer Notifications

Phase-5 decision D4. Builds on steps 2–3 and the Phase 4 reminder infrastructure (`expo-notifications`).

## Goal
A local notification fires at each enabled prayer time — offline, no account, no push server.

## Scope
1. **`src/features/salah/data/notifications.ts`:**
   - Rolling schedule: for each enabled prayer, schedule the next **8 days** of triggers from the on-device times.
   - Refresh triggers: app foreground, location source/coordinate change, any toggle change, timezone change.
   - Cancellation is total-before-reschedule (idempotent; no duplicates).
   - System default sound; title/body from i18n («حان وقت صلاة الفجر»). No bundled adhan audio (D4).
2. **Toggles:**
   - Per-prayer bell on `PrayerTimeRow` (wired here) — persisted in MMKV (`storageKeys`), same pattern as the daily reminder; default **off**, nothing pre-enabled.
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
