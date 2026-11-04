# Step 4b — Iqamah offset notifications

Parent plan: `docs/plans/iqamah-offset.md`. ADR: **0056** (proposed). Depends on step 4 prayer notifications and ADR 0047 adhan sound (shipped in code).

## Goal

When the user sets a global iqamah offset (5–30 minutes, or off), a **system-sound** local notification fires that many minutes **before** each **enabled** prayer’s adhan time. Adhan notifications keep ADR 0047 behaviour. Tap opens `/salah`.

## Scope

1. **`budget.ts`:** `PRAYER_ROLLING_DAYS_ADHAN_ONLY = 8`, `PRAYER_ROLLING_DAYS_WITH_IQAMAH = 4`, `prayerRollingDays(offset)`.
2. **`iqamah-offset.ts`:** MMKV `storageKeys.salah.iqamahOffsetMinutes`; values `0 | 5 | 10 | 15 | 20 | 30`; default off.
3. **`notifications.ts`:** `iqamahFireDates`, `iqamahNotificationContent`, schedule iqamah when offset &gt; 0; adhan uses `prayerRollingDays(offset)` for window size; `scheduleSettings()` includes offset; `setIqamahOffset` resyncs.
4. **Sound:** iqamah `sound: 'default'`, Android `channelId: prayer` only — never `prayer_adhan_*` / `prayer_silent`.
5. **Payload:** iqamah `data: { route: '/salah', kind: 'iqamah' }`; adhan unchanged.
6. **Settings UI:** `IqamahOffsetRow` in `PrayerNotificationsSection` (after prayer toggles, before adhan sound row).
7. **i18n:** `notifications.iqamah.*`, `salah.iqamahOffset.*` (or `settings.prayerNotifications.iqamahOffset.*`).

## Out of scope

- Per-prayer offset; Salah screen entry; API; changing adhan catalogue/channels; spec §13 edit (separate doc commit with ADR acceptance).

## Tests

- `budget.test.ts`: rolling days 8 vs 4; 5×4×2 ≤ 40.
- `iqamah-offset.test.ts`: MMKV get/set/validation.
- `notifications.test.ts`: fire math (−offset, skip past); sync counts; content sound and `kind`; cancel by route clears both; android channel for iqamah.
- `IqamahOffsetRow.test.tsx`, update `PrayerNotificationsSection.test.tsx`.

## Gates

- ADR 0056 accepted.
- Mobile: `npm run lint && npx tsc --noEmit && npm test`.
- ADR 0010: frame or developer waiver for Settings row.

## Implementer checklist

- [ ] Read `docs/plans/iqamah-offset.md` and ADR 0056.
- [ ] Do not touch adhan voice picker or `ensurePrayerChannel` logic except calling `ensureNotificationChannel('prayer')` for iqamah.
- [ ] Confirm pending count ≤ 40 with all bells on and offset 10 in unit test.
