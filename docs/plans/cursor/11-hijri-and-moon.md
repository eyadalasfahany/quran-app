# Prompt 11 — Hijri calendar and moon sighting (two sessions: Part A, then Part B)

Monorepo `D:\projects\quran-app`, `apps/mobile`. Follow @docs/plans/cursor/README.md. Read first: @apps/mobile/CLAUDE.md @.claude/agent-rules.md @docs/plans/names-hijri-moon.md (steps H0-H6 and M1-M6, mirror table, frames) and the names/Hijri/moon ADR (`docs/adr/0047-names-hijri-moon.md` after prompt 14, `0043-names-hijri-moon.md` before it), above all "Developer decisions (2 Nov 2026)". Frames, approved by those decisions: `HijriCalendar`, `HijriCalendarDark`, `HijriCalendarEnglish`, `HijriAdjust`, `HijriAdjustDark`, `HomeHijriDate`, `HomeHijriDateDark`, `MenuNewCards`, `MenuNewCardsDark`, `MenuNewCardsEnglish`, `MoonSighting`, `MoonSightingDark`, `MoonSightingEnglish`, `MoonSightingNoLocation`. Render each with `frame-shot.py` and match it. **No Names (N1-N7)**: the developer has not named the printed edition yet. In `MenuNewCards`, leave out the Names card.

**Already done:** nothing in code. `formatHijriDate` exists in `src/core/i18n/dates.ts:38`. Salah reads it through `useHijriDate` in `src/features/salah/hooks/index.ts:162`. The content-plan row for `suncalc` 2.1.1 (proposed) is at `docs/content-plan.md:51`.

**Decisions to apply (developer, 2 Nov 2026):**
- The adjustment (−2…+2 days, MMKV) applies everywhere a Hijri date is shown, including the Salah header. Only the date text changes there. Prompt 12 makes the one-line Salah switch, so **this prompt doesn't edit `src/features/salah/**`**.
- Occasions are the agreed dates only: 1 and 10 Muharram, 1 Ramadan, 1 Shawwal, 9 and 10 Dhul Hijjah, and the white days 13-15 of every month. Names go in i18n. No virtue text.
- No feature switch. A Hijri surface hides only when the engine reports the calendar unavailable (platform capability).

**Part A — Hijri (H1-H4; H5 is in prompt 12):**
1. `src/features/hijri/data/`:
   - `hijri-date.ts`: `toHijri(date: Date, adjustDays: number): HijriDate | null`, with cached `Intl.DateTimeFormat('en-u-ca-islamic-umalqura')`, and null when `resolvedOptions().calendar` isn't `islamic-umalqura`.
   - `month.ts`: `hijriMonth(year, month, adjustDays)`.
   - `adjustment.ts`: MMKV key `hijri.adjustDays`, added to `src/core/storage/mmkv.ts` `storageKeys` and to clear-data in `src/core/db/user/clear.ts`. Clamp to −2…+2. Exports `useHijriAdjustment()`.
   - `occasions.ts`: `upcomingOccasions(from, adjustDays, count)`.
2. `src/features/hijri/hooks/useHijriDate.ts`: `useHijriDate(now?: Date): string`. It is adjustment-aware and formats through `formatHijriDate(date, locale, adjustDays)`. Extend `formatHijriDate` with an optional third parameter that defaults to 0, so the current Salah call stays byte-identical.
3. Components (`src/features/hijri/components/`, one file and test each): `HijriMonthHeader`, `HijriWeekdayRow`, `HijriDayCell`, `HijriMonthGrid`, `HijriNote`, `HijriAdjustRow`, `OccasionRow`, `OccasionList`, `HijriAdjustSheet` (through `SheetHost`), `HomeDatePill`, `MenuHijriCard`.
   - The week starts on Saturday in Arabic and Sunday in English.
   - Digits go through `arabizeDigits`.
   - At accessibility text sizes, the grid becomes a day list: use `src/core/theme/useTextScale.ts` and pick a threshold from the frame.
   - In a short window, the grid and the occasions sit side by side. In expanded, occasions go in the side panel.
4. Screens and routes:
   - `HijriCalendarScreen` at `app/hijri/index.tsx`, with `pushScreenOptions`.
   - `app/hijri/adjust.tsx`, as a sheet.
   - The Home date pill in `HomeScreen.tsx`, per `HomeHijriDate`.
   - The Menu card in `MenuScreen.tsx`, per `MenuNewCards`.
5. Tests: H1/H2 as the plan lists them (round trip 1445-1450, 29/30 month ends, year end, clamp, DST day, a mocked `Intl` without the calendar giving null, each occasion for 1448 and 1449, white days in a 29-day month); every component; screen navigation, today, adjustment and RTL column order; short and expanded layout.

**Part B — Moon (M1-M4):**
1. **M1 gate.** `npx expo install suncalc@2.1.1` and `npm install -D -w @quran/mobile astronomy-engine` (dev-only, comparison only). Add `@types/suncalc` only if it has a release in the last 12 months; otherwise write a local `suncalc.d.ts`. Then add committed fixtures `src/features/moon/data/__fixtures__/`:
   - 24 new moons, Nov 2026 to Oct 2028, as conjunction instants from NASA GSFC. Record the URL.
   - 100 evenings at 5 latitudes.

   The test `spike.test.ts` requires that `suncalc` altitude with the inverse-refraction step (cite the formula) agrees with `astronomy-engine`'s **geometric** (unrefracted) altitude within 0.05° in arc of vision, and that conjunction agrees within 10 min. **If it fails, stop and report: the developer decides on the `astronomy-engine` runtime exception.** Mark `suncalc` "approved" in the content plan, and add its BSD-2 notice to Sources and thanks.
2. M2 `src/features/moon/data/`: `moon-state.ts`, `conjunction.ts`, `evening.ts`, `crescent.ts` (Odeh V primary, computed on geometric altitude; Yallop q secondary), `refraction.ts`, `format.ts`. Cite the papers and pages in comments. Zone labels and the disclaimer go in i18n. **The Arabic copy is left as `TODO-REVIEW` placeholders in both locales and reported**: don't write the criterion's Arabic text yourself.
3. M3 `useMoonLocation.ts`, which only reads `peekPrayerLocation`/`loadPrayerLocation`. Its test spies to prove it makes no writes and no permission requests.
4. M4 components `MoonPhaseDisc`, `MoonSummaryCard`, `MoonTimesCard`, `MoonTimeRow`, `VisibilityEstimateCard`, `VisibilityZoneScale`, `MoonDisclaimer`, `MoonNoLocation`. Screen `MoonSightingScreen`, route `app/moon/index.tsx`, and `MenuMoonCard`. The disclaimer is always present whenever an estimate is. Draw the moon geometry with `react-native-svg`, not with `left`/`right`.

**Acceptance:** Salah's `git diff` is unchanged by this prompt; adjustment +1 moves the Home pill, calendar and Menu card together; no occasion beyond the agreed list; the spike gate's result is reported with numbers; every screen matches its frame in Arabic, English and dark.

**Gates:** `npx jest src/features/hijri src/features/moon src/features/home src/features/menu src/core`, then the full suite; `lint` and `tsc` at 0; `node .github/scripts/npm-audit.mjs`.

**Emulator (H0 Android half, H6, M5 partial):**
- Add a temporary, uncommitted dev screen that prints `toHijri` for the 36 month starts of 1447-1449, and `resolvedOptions().calendar`. Put the table in your summary, then delete the screen.
- Check airplane mode, Arabic/English, light/dark, landscape rail and large text.
- Compare ten evenings with timeanddate.com for Makkah.
- The iPhone half of H0 needs the developer's Mac; say so.
