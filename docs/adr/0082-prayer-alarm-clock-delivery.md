# 0082 — Prayer notifications use alarm-clock delivery on Android (9 Nov 2026)

Date: 2026-11-09 · Status: **accepted** (developer, 9 Nov 2026) · Amends ADR 0030 §3 and ADR 0035 §5.

## Context

Some Android OEM builds defer `setExactAndAllowWhileIdle()` alarms under their battery policies. Prayer notifications then arrive late, or seem missing, on those devices. Adhan and iqamah are the notifications that must arrive on time.

## Decision

1. On Android, adhan and iqamah notifications are scheduled with expo-notifications' `delivery: 'alarmClock'`, which uses `AlarmManager.setAlarmClock()`. OEM battery policies do not defer these alarms.
2. Without exact-alarm access (`SCHEDULE_EXACT_ALARM`), the library falls back to inexact `setAndAllowWhileIdle`, as before.
3. iOS ignores the field and is unchanged.
4. Other reminders (daily, azkar, goals) keep the default `bestEffort` delivery.

## Consequences

- Android shows an alarm icon in the status bar while a prayer notification is pending. With a bell on, that is effectively always.
- The system "next alarm" (lock screen, clock) may show the next prayer.
- Without exact-alarm access the delivery is inexact, so the exact-alarm dialog (ADR 0064) still matters.
- iOS is unchanged.
- The change is JavaScript only and ships as an EAS Update. The store builds already carry expo-notifications 58.1.8.
- A force-stop by the user, or an OEM task killer, still cancels every alarm until the next launch. The app re-plans on every launch, so the schedule comes back then.
