# 0084 — Background re-plan of reminders, and Time-Sensitive prayer notifications on iOS (9 Nov 2026)

Date: 2026-11-09 · Status: **proposed** (waiting for the developer) · Extends ADR 0030 §3, ADR 0031 §7, ADR 0056 and ADR 0082. Works with ADR 0083 (Android prayer window and "renew" reminder; drafted in parallel, check its final text before accepting this one). Plan: `docs/plans/notifications-reliability-1.0.4.md`.

## Context

Prayer and Azkar notifications are local and are planned in a rolling window (`budget.ts`: iOS keeps 64 pending, so prayers hold 8 days, or 4 with an iqamah offset). The window is refreshed only when the app opens (`usePrayerNotificationsSync`, `resyncAzkarRemindersIfNeeded`). A user who does not open the app for longer than the window gets no notifications until they do. ADR 0083 adds a reminder that asks the user to open the app. It does not remove the cause.

On iOS, an adhan notification is an ordinary "active" notification. A Focus mode or the notification summary can hold it back, which defeats a notification that exists to be on time.

Both fixes are native: a new module changes the runtime fingerprint (`apps/mobile/CLAUDE.md`, «Releasing»), as does an entitlement. They ship together in the 1.0.4 store build, and implementation starts only after the current OTA batch is published, because an update cut after the native change would not reach 1.0.3.

## Decision

1. **Background re-plan.** The app registers one background task with `expo-background-task` (SDK 58, `~58.0.12`, MIT, released 31 Oct 2026, with `expo-task-manager` `~58.0.13` released the same day; it uses WorkManager on Android and `BGTaskScheduler` on iOS). The task runs about every 12 hours and calls the existing serialized `resyncPrayerNotificationsIfNeeded` and `resyncAzkarRemindersIfNeeded`. The task is defined at module top level and imported from `index.ts`.
2. **No prompt, no GPS in the background.** The task reads the saved manual city, else the last known position, else the coordinates of the last good sync, read through `coordsFromKey` on the existing sync state (ADR 0083 amendment, 9 Nov 2026). No new storage key. It never requests a fix, a permission or a notification prompt.
3. **A missing location never wipes the schedule.** If no coordinates can be found, the task leaves the pending notifications as they are. (Today `syncPrayerNotifications` cancels everything first and plans nothing when the coordinates are null.)
4. **Registered only while needed.** The task is registered when a prayer bell or an Azkar reminder is on, and unregistered when none is.
5. **iOS runs it opportunistically.** The system decides when, and rarely for an app the user has not opened lately. So the ADR 0083 renew reminder stays. Android runs it from WorkManager, within Doze and OEM limits; a force-stop cancels it until the next launch.
6. **Time-Sensitive on iOS.** Adhan and iqamah content sets `interruptionLevel: 'timeSensitive'`, and `app.config.ts` adds the entitlement `com.apple.developer.usernotifications.time-sensitive`. Daily reading, Azkar, goals, Friday and misbaha reminders stay "active". Android ignores the field (ADR 0082 covers its delivery).
7. **One store build, 1.0.4,** carries both. No new permission is requested from the user.

## Consequences

- Prayer notifications keep coming for a user who has not opened the app, on Android reliably within platform limits, and on iOS when the system allows it. The user may still need to open the app after a long absence on iOS (ADR 0083).
- iOS gets two new Info.plist entries from the plugin: `UIBackgroundModes` gains `processing` (beside `audio`) and `BGTaskSchedulerPermittedIdentifiers` lists `com.expo.modules.backgroundtask.processing`. App Review sees a new background mode; the review note explains it (plan, step 9).
- The Apple App ID must have the Time Sensitive Notifications capability, and the provisioning profile must carry it, before the build signs.
- The user can turn Time-Sensitive off per app in iOS Settings > Notifications > Taybah, and a Focus can still be set to block it. The app shows nothing for that; with it off, prayer notifications behave as today.
- Time-Sensitive does not bypass the ring/silent switch. Only critical alerts do, and the app does not use them.
- Each background run starts the JavaScript runtime (Android: headless; iOS: a background launch). It runs the same bundle, so module-level side effects in `index.ts` run too. The task body must not touch UI, the database or the network.
- Two native packages enter the app: `expo-background-task` and `expo-task-manager` (its dependency, installed explicitly). Both need the content-plan version table row and the usual audit.
- Not planned: background fetch of content, widget refresh from the task, a user-facing setting for the task.
