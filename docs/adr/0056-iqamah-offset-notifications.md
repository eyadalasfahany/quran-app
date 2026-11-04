# 0056 — Iqamah offset local notifications

Date: 2026-11-03 · Status: **Accepted** (developer requested implementation on 3 Nov 2026) · Amends ADR 0030 §3 (Local prayer notifications), ADR 0047 §6 (sound scope unchanged for adhan). Plan: `docs/plans/iqamah-offset.md`.

## Context

Prayer notifications today fire at the calculated adhan time for each enabled prayer (ADR 0030 §3, ADR 0047). Users also want an iqamah reminder **after** the adhan — N minutes after that same prayer time — with copy along the lines of «الإقامة بعد قليل» / “Iqamah soon”. That reminder must not use the selectable adhan voice (ADR 0047); it uses the system default notification sound, like Azkar and the daily reminder.

iOS allows at most 64 pending local notifications (`apps/mobile/src/features/notifications/budget.ts`). Prayer already reserves 40 slots (5 prayers × 8 rolling days). Adding a second notification per prayer without shrinking the window would need 80 slots and break the budget.

## Decision

1. **One global iqamah offset** (minutes **after** the adhan / prayer time), stored in MMKV. Default **off** (0 / unset): no iqamah notifications until the user chooses a positive offset. Allowed values: **0, 5, 10, 15, 20, 30** only.
2. **Schedule:** For each enabled prayer, the **adhan** notification fires at the prayer time (unchanged). When offset &gt; 0, an **iqamah** notification fires at `prayerTime + offsetMinutes`. Skip any candidate whose fire time is ≤ `now` (same rule as adhan).
3. **Rolling window (budget):**
   - Offset **0:** adhan only, **8** future fires per enabled prayer (`PRAYER_ROLLING_DAYS_ADHAN_ONLY = 8`) — current behaviour.
   - Offset **&gt; 0:** both adhan and iqamah, **4** future fires per kind per enabled prayer (`PRAYER_ROLLING_DAYS_WITH_IQAMAH = 4`). Worst case: 5 × 4 × 2 = **40** slots; `PRAYER_NOTIFICATION_SLOTS` stays 40.
4. **Sound:** Iqamah content always sets `sound: 'default'`. Android uses channel `prayer` (`NOTIFICATION_CHANNELS.prayer`), not any `prayer_adhan_*` or `prayer_silent` channel. Adhan notifications keep ADR 0047 behaviour unchanged.
5. **Payload and deep link:** Tap opens `/salah` (same as adhan). Iqamah sets `data: { route: '/salah', kind: 'iqamah' }`. Adhan keeps `data: { route: '/salah' }` (no `kind`, backward compatible). Cancellation continues to match `data.route === '/salah'`, so both kinds cancel together.
6. **Refresh triggers:** Same as prayer notifications today — launch, foreground (day/time zone), location keys, bell toggles, adhan voice, and **iqamah offset** (via `scheduleSettings()`).
7. **UI:** One row in Settings «إشعارات الصلاة» (`PrayerNotificationsSection`), after the five prayer toggles and before (or after — see plan) the adhan sound row. No Salah-tab mirror unless the developer adds it later.
8. **Copy:** i18n only (`notifications.iqamah.*`); no generated religious content.

## Consequences

- Positive: iqamah reminder offline, no API, fits the existing 40-slot prayer budget when offset is on.
- Negative: with offset on, adhan fires only 4 days ahead instead of 8 until the next sync (acceptable trade-off documented in the plan).
- Unchanged: adhan voice catalogue, picker, and Android adhan channels; Azkar and daily reminder sounds.

## Alternatives considered

- **8-day window for both kinds (80 slots).** Rejected: exceeds iOS limit without cutting Azkar or other categories.
- **Per-prayer iqamah offset.** Rejected for v1: developer asked for one global offset unless frames require otherwise; none exist today.
- **Separate Android channel `prayer_iqamah`.** Rejected: same system sound as `prayer`; extra channel adds settings noise with no sound benefit (plan allows revisiting if product wants separate importance).

## Amendment (3 Nov 2026)

Offset direction corrected to match mosque practice and the developer's clarification: **adhan at prayer time, then iqamah after the offset** (`prayerTime + offsetMinutes`). The earlier draft used minutes *before* the prayer time; that is superseded. UI copy uses «بعد الأذان» / “after adhan”. The QA test button schedules adhan first, then iqamah.

## Release blockers

- ADR 0010: frame or explicit developer approval for the Settings iqamah offset row (same gap as the original prayer notifications section).
- Developer acceptance of this ADR and the Arabic/English strings in the plan.
