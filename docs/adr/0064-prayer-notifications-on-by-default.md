# 0064 — Prayer notifications on by default once a location is set

Date: 2026-11-05 · Status: **accepted** (developer, 5 Nov 2026) · Amends: phase-5 step 4 ("default off, nothing pre-enabled"), spec §13 ("permission is requested only when a switch is turned on")

## Context

The five prayer bells defaulted to off, and each had to be turned on by hand. The developer wants prayer notifications on by default, with the user free to turn them off, starting when the user approves location access.

## Decisions

1. **A usable location arms the bells.** Once foreground location permission is granted or a manual city is chosen, every bell the user has never set turns on and the schedule is planned. Before that, bells read as off.
2. **An unset MMKV key means untouched.** An explicit `false` is the user's choice and is never overwritten, so turning a bell off sticks. No new storage key is needed. «مسح البيانات» removes the bell keys, which restores the default.
3. **Notification permission is asked at that moment,** right after the location prompt, because a bell cannot deliver without it. A refusal stores the untouched bells as off, so the prompt is not repeated. The user can still turn a bell on later, which follows the normal path.
4. **Checked in two places:** straight after the in-app location prompt (Salah and Qibla screens), and in `usePrayerNotificationsSync` on launch, on each foreground and on a location change. The second covers permission granted in system Settings, a chosen city, and existing installs.
5. **Existing installs are included** (developer, 5 Nov 2026). An install with a usable location and unset bells gets them turned on at its next launch.
6. **The exact-alarm dialog shows once after arming** (Android 14+, when exact alarms are denied). It offers the system screen; the bells stay on either way. It is not repeated if dismissed, and tapping a bell still shows it as before.

## Consequences

- An existing install may see a notification prompt at launch, with no bell tap before it, if it has not answered one.
- A user who dismisses the exact-alarm dialog gets inexact delivery until they grant exact alarms.
- All five bells on takes the full prayer budget (40 of the iOS 64 slots), which `budget.ts` already reserves.
