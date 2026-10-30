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

