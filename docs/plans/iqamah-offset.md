# Plan: Iqamah offset notifications

Status: **draft** (planner, 3 Nov 2026). No app code until ADR 0056 is accepted and step brief is approved.

## Rests on

- ADR 0030 §3 (local prayer notifications, rolling schedule), **ADR 0056** (this feature), ADR 0047 §6 (Azkar/daily default sound; adhan voice separate), ADR 0031 §7 (shared notification layer), ADR 0010 (frame before UI), ADR 0027 (local-only), root non-negotiables 4, 6, 7.
- Spec §13 Notifications, §15 Phase 5 row; `docs/plans/phase-5.md` step 4, `docs/plans/phase-5/step-04-prayer-notifications.md`.
- Code read: `apps/mobile/src/features/salah/data/notifications.ts`, `bells.ts`, `adhan-sounds.ts`, `apps/mobile/src/features/notifications/budget.ts`, `channels.ts`, `reminder-deeplink.ts`, `apps/mobile/src/features/settings/components/PrayerNotificationsSection.tsx`, `apps/mobile/src/core/storage/mmkv.ts`, `apps/mobile/src/features/azkar/reminders/schedule.ts` (prayer-relative math pattern), `apps/mobile/src/features/azkar/reminders/reminder-service.ts` (system sound pattern), i18n `notifications.prayer` in `ar.json` / `en.json`.

## Spec vs code (call-outs — do not silently pick one)

| Topic | Spec / plan doc | Code today | Action |
| --- | --- | --- | --- |
| Prayer rolling days | ADR 0030 §3 says 8-day rolling schedule | `PRAYER_ROLLING_DAYS = 8` in `budget.ts` | Amend spec §13 when implementing: **8 days adhan-only; 4 days each kind when iqamah offset &gt; 0** (ADR 0056). |
| Default adhan sound | Spec §13 still says “system default (default)” | ADR 0047 / code: default `allahu_akbar_short` | Existing drift; **not** part of this change. Do not “fix” in the iqamah PR unless the developer asks. |
| Azkar budget slots | Spec §13 line ~747 says “Azkar 23” | `AZKAR_SLOTS = 21` in `budget.test.ts` (64 − 1 − 40 − 1 − 1) | Existing drift; iqamah keeps `PRAYER_NOTIFICATION_SLOTS = 40`. |

## Recommended budget decision

**When iqamah offset &gt; 0:** schedule **4 rolling days** for **both** adhan and iqamah per enabled prayer → at most 5 × 4 × 2 = **40** pending prayer notifications. **When offset is 0:** adhan only, **8** rolling days per enabled prayer → 5 × 8 = **40**. `PRAYER_NOTIFICATION_SLOTS` remains **40**; `AZKAR_SLOTS` unchanged.

Constants to add in `budget.ts`:

```ts
export const PRAYER_ROLLING_DAYS_ADHAN_ONLY = 8;
export const PRAYER_ROLLING_DAYS_WITH_IQAMAH = 4;
/** @deprecated alias — use prayerRollingDays(getIqamahOffsetMinutes()) in new code */
export const PRAYER_ROLLING_DAYS = PRAYER_ROLLING_DAYS_ADHAN_ONLY;

export function prayerRollingDays(iqamahOffsetMinutes: number): number {
  return iqamahOffsetMinutes > 0 ? PRAYER_ROLLING_DAYS_WITH_IQAMAH : PRAYER_ROLLING_DAYS_ADHAN_ONLY;
}

/** Max pending prayer notifications if all five bells on and iqamah on: 5 × 4 × 2 === PRAYER_NOTIFICATION_SLOTS */
export function maxPrayerPendingCount(iqamahOffsetMinutes: number, enabledPrayerCount: number): number {
  const days = prayerRollingDays(iqamahOffsetMinutes);
  const kinds = iqamahOffsetMinutes > 0 ? 2 : 1;
  return enabledPrayerCount * days * kinds;
}
```

Update `budget.test.ts`: assert `prayerRollingDays(0) === 8`, `prayerRollingDays(10) === 4`, and `5 * 4 * 2 === PRAYER_NOTIFICATION_SLOTS`.

## MMKV

| Key | Constant | Type | Default | Notes |
| --- | --- | --- | --- | --- |
| `salah.iqamahOffsetMinutes` | `storageKeys.salah.iqamahOffsetMinutes` | number | **absent → 0** | Only **0 \| 5 \| 10 \| 15 \| 20 \| 30** persisted; invalid stored values coerced to **0** on read. |

Add to `scheduleSettings()` JSON in `notifications.ts`: `iqamahOffset: getIqamahOffsetMinutes()`.

Data module (new file suggested): `apps/mobile/src/features/salah/data/iqamah-offset.ts` — `IQAMAH_OFFSET_OPTIONS`, `getIqamahOffsetMinutes`, `setIqamahOffsetMinutes`, `setIqamahOffset` (write + `resyncPrayerNotifications`).

## Schedule algorithm

Pure functions (test without mocks):

1. **`prayerFireDates`** — keep; caller passes `days = prayerRollingDays(offset)` instead of always `PRAYER_ROLLING_DAYS`.
2. **`iqamahFireDates(prayers, now, coords, offsetMinutes, days)`** — mirror `prayerFireDates` structure:
   - Walk calendar days `0..days` inclusive (same as adhan).
   - For each prayer, collect `timesFor(day, coords)[prayer].getTime() - offsetMinutes * 60_000`.
   - Keep finite times with `ms > now.getTime()`, sort, `slice(0, days)` per prayer.
   - Return `{ prayer, date }[]` (reuse `PrayerFire` or add `kind` in sync loop only).
3. **`syncPrayerNotifications`** — after cancel + optional `ensurePrayerChannel(sound)` for adhan:
   - Schedule adhan fires with `prayerNotificationContent(prayer, sound)` and `prayerTrigger(date, sound)`.
   - If `offset > 0`: `ensureNotificationChannel(NOTIFICATION_CHANNELS.prayer)` on Android; for each iqamah fire, schedule `iqamahNotificationContent(prayer)` with `sound: 'default'` and trigger `{ type: DATE, date, channelId: 'prayer' }` on Android (iOS: DATE only).
4. **Coordinates:** unchanged — read coords only when at least one bell is on; iqamah does not schedule without enabled prayers.

**Interaction with silent adhan:** adhan may be silent (`sound: false`); iqamah still uses system default. Document in ADR; no extra developer decision unless they want iqamah off when adhan is silent (not requested).

## Android channel

**Reuse `NOTIFICATION_CHANNELS.prayer` (`'prayer'`)** for iqamah triggers. Do **not** create `prayer_iqamah`. Rationale: identical system default sound; ADR 0047 reserves `prayer` for system-sound prayer category; iqamah is not an adhan voice.

## Payload and cancellation

| Kind | `content.data` | Deep link |
| --- | --- | --- |
| Adhan | `{ route: '/salah' }` | `/salah` (unchanged) |
| Iqamah | `{ route: '/salah', kind: 'iqamah' }` | `/salah` |

`cancelPrayerNotifications()` — **no change** (still `route === '/salah'`). `reminder-deeplink.ts` — **no change** (`kind` ignored for navigation).

## i18n keys (ar / en)

Under `notifications.iqamah`:

| Key | EN (draft) | AR (draft — developer to approve) |
| --- | --- | --- |
| `title` | Iqamah soon | الإقامة بعد قليل |
| `body` | The Iqamah for {{name}} prayer will be soon | الإقامة لصلاة {{name}} بعد قليل |

Use `home.salah.*` for `{{name}}` (same as adhan). Optional `bodyWithPlace` only if product wants parity with adhan place line — **not in developer request**; omit unless approved.

Settings / picker (under `salah.iqamahOffset` or `settings.prayerNotifications.iqamahOffset`):

| Key | Purpose |
| --- | --- |
| `label` | Row title («تذكير الإقامة» / “Iqamah reminder”) |
| `off` | Summary when 0 («إيقاف» / “Off”) |
| `before_one` / `_two` / `_few` / `_many` / `_other` | «{{number}} دقيقة قبل» / “{{number}} minutes before” (i18next `count`) |
| `sheetTitle` | Sheet header |
| `optionOff` | Explicit off chip/row |

Do not reuse `azkar.reminders.offsetAfter*` — those mean **after** prayer; iqamah is **before**.

## UI placement

- **File:** new `IqamahOffsetRow.tsx` (+ test) and optionally `IqamahOffsetSheet.tsx` (+ test) under `features/settings/components/` or `features/salah/components/` if reused from Salah later.
- **Compose in** `PrayerNotificationsSection.tsx`: order **five toggles → iqamah offset row → adhan sound row** (offset is scheduling, sound row stays ADR 0047).
- **Pattern:** `ListRow` with chevron, trailing shows off or “N minutes before”; opens sheet with fixed options 0, 5, 10, 15, 20, 30 (chips or radio list — match `SettingsGroup` / `ToggleRow` tokens).
- **Hook:** `useIqamahOffset()` — MMKV subscription like `usePrayerSound`.
- **Frame:** none in `quran-app-screens.html` today — **release blocker:** draw `#Settings` extension or developer approves reusing group layout like adhan sound row (ADR 0010).

## Tests (each step ships with its tests)

| Area | File | Cases |
| --- | --- | --- |
| Budget math | `budget.test.ts` | `prayerRollingDays`, max 40 with iqamah on |
| Iqamah fire dates | `iqamah-offset.test.ts` or `notifications.test.ts` | 4 futures per prayer; subtract offset; skip ≤ now; empty when offset 0; no coords |
| Content | `notifications.test.ts` | iqamah title/body ar/en; `sound: 'default'`; `data.kind === 'iqamah'`; adhan unchanged |
| Sync | `notifications.test.ts` | all bells on, offset 10 → 40 pending `/salah`; offset 0 → 40 adhan only; offset change reschedules; cancel removes both kinds |
| Android trigger | `notifications.test.ts` (Platform android) | iqamah `channelId: 'prayer'`, adhan still uses voice channel |
| MMKV | `iqamah-offset.test.ts` | default 0; round-trip; invalid → 0; `scheduleSettings` includes offset |
| UI | `IqamahOffsetRow.test.tsx` | render, open sheet, select 15, RTL, a11y label |
| Section | `PrayerNotificationsSection.test.tsx` | iqamah row present |

## Decisions that need the developer

1. Accept ADR 0056 and the draft ar/en strings above.
2. ADR 0010: approve Settings row layout (frame or explicit waiver).
3. Iqamah when adhan sound is **silent** — plan assumes iqamah still fires with system sound (recommended).
4. Whether iqamah offset row should also appear on the Salah screen (plan: Settings only).

## Release blockers

- ADR 0056 accepted.
- Settings UI frame or approved waiver (ADR 0010).
- Device check: one enabled prayer, offset 5 min, verify two notifications (iqamah then adhan) with correct sounds on iOS + Android build.

## Ordered implementation steps (Haiku)

1. **Docs gate (developer):** Accept ADR 0056; amend ADR 0030 §3 pointer; update spec §13 prayer bullet (rolling days + iqamah); note in `phase-5.md` / step-04b brief.
2. **`budget.ts`:** Add constants and `prayerRollingDays` / `maxPrayerPendingCount`; extend `budget.test.ts`. Wire `notifications.ts` to use `prayerRollingDays(getIqamahOffsetMinutes())` for adhan `prayerFireDates` `days` arg.
3. **`iqamah-offset.ts`:** MMKV key, allowed set, get/set, export options array `[0,5,10,15,20,30]`; unit tests.
4. **Pure schedule:** `iqamahFireDates` + tests; extend `prayerFireDates` tests for `days=4`.
5. **`notifications.ts`:** `iqamahNotificationContent`, dual schedule in `syncPrayerNotifications`, `scheduleSettings` + `setIqamahOffset`; ensure `prayer` channel before iqamah on Android; extend `notifications.test.ts` (pending mock, both kinds, budget 40).
6. **i18n:** Add keys to `ar.json` and `en.json`.
7. **UI:** `IqamahOffsetRow` (+ sheet if needed), `useIqamahOffset`, compose into `PrayerNotificationsSection`; colocated tests; update section test.
8. **Review:** `npm run lint && npx tsc --noEmit && npm test` in `apps/mobile`; taybah-code-reviewer on diff; optional device smoke (step 6 exit check can include iqamah).

Steps 2–5 can be one PR without UI; step 7 needs ADR 0010 clearance.

## Phase 5 plan note

Track as **step 4b** (after prayer notifications + adhan sound ship): `docs/plans/phase-5/step-04b-iqamah-offset-notifications.md`. Does not block step 6 exit check unless the developer wants iqamah in the Phase 5 exit criterion (default: **no** — add to exit checklist optionally).
