# 0083 — Longer Android prayer window and a renew reminder (9 Nov 2026)

Date: 2026-11-09 · Status: **accepted** (developer, 9 Nov 2026) · Amends ADR 0030 §3, ADR 0056 and ADR 0031 §7.

## Context

Local notifications are scheduled a fixed window ahead and re-planned on every launch and foreground. A user who does not open the app gets nothing once the window runs out: prayer notifications stop after 8 days on iOS and 14 on Android, and Azkar reminders stop after their 4-day window.

iOS caps pending local notifications at 64 per app, so its windows cannot grow. Android has no such cap; AlarmManager allows about 500 alarms per app.

The spec said the Azkar prayer-relative window is 8 days. The code has always used 4 (`AZKAR_ROLLING_DAYS = 4`), so the spec was wrong.

## Decision

1. **Prayer window.** iOS keeps 8 days adhan-only and 4 days with iqamah (40 pending in both cases). Android uses 14 days adhan-only and 7 days with iqamah. Five prayers × 14 = 70, and five × 7 × 2 = 70, stay far under the Android limit with Azkar and goals included.
2. **Renew reminder.** One notification, shared by prayer and Azkar, asks the user to open Taybah before a schedule runs out.
   - Each source records its last scheduled fire. The renew uses the earliest of those (prayer: the latest adhan or iqamah fire; Azkar: the earliest last fire among the prayer-relative reminders). A source with nothing that expires records null and is ignored.
   - The renew fires 24 hours before that earliest fire.
   - If that moment has already passed, it fires one minute after the earliest fire instead, so a short window still gets a reminder.
   - If that is also past, nothing is scheduled.
   - It is a default-delivery notification on Android, in the `reminders` channel. Tapping it opens the الصلاة screen (prayer) or the Azkar home (Azkar).
3. **Copy.** «تنبيهات الصلاة» / «افتح طيبة ليستمر وصول تنبيهات الصلاة.» and «تذكيرات الأذكار» / «افتح طيبة ليستمر وصول تذكيرات الأذكار.» (English equivalents in `en.json`).
4. **Budget.** The renew takes one iOS slot, taken from Azkar: Azkar goes from 21 to 20 (64 = daily 1 + prayer 40 + Friday 1 + misbaha 1 + renew 1 + Azkar 20). The Azkar window stays at 4 days; the spec's 8 was wrong.

## Consequences

- The change is JavaScript only and ships as an EAS Update. No native field, plugin or package changes.
- The schedule is still re-planned only when the app runs. A background re-plan (so the schedule renews without the app opening) comes with the 1.0.4 store build, under its own ADR.
- A user who never opens the app after the renew notification still stops getting prayer and Azkar notifications when the window runs out. The renew is a prompt, not a substitute for opening the app.
- Android now schedules up to 70 prayer notifications. This stays under the AlarmManager limit, with room for the other categories.
- iOS is unchanged in prayer behaviour; its Azkar pool shrinks by one slot to make room for the renew.

## Amendment (9 Nov 2026): a missing location keeps the last coordinates

Before this amendment, a sync that could not read the location (no last-known fix under 24 h on Android, a lost permission, or a failed indoor fix) passed `null` to the planner. The prayer sync then cancelled every pending prayer notification and planned none, so a user could go a day with no prayer notifications. Prayer and Azkar syncs now fall back to the coordinates the last sync recorded, rounded to two decimals as `coordsKey` already is (`coordsFromKey` in `notifications/sync-state.ts`). A missing fix never wipes a schedule. A user who revoked location keeps getting times for the last place until a new location or a manual city is set.
