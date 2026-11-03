# أسماء الله الحسنى, Hijri calendar and moon sighting (proposed follow-up)

Status: **accepted (developer, 3 Nov 2026)**. All 12 decisions accepted (ADR 0043 «Decisions accepted, 3 Nov 2026»). Audio rules for Names are in ADR 0055. Branch: `ft/names-hijri-moon`.

Rests on: `docs/adr/0043-names-hijri-moon.md` (the decision and the research; accepted 3 Nov 2026), ADR 0008 (Quran audio), ADR 0010 (frames first), 0014, 0017, 0027, 0030 §6, 0031 (provenance and locks), 0032 (Menu), 0034, 0036, `docs/adr/0042-features-enabled-by-default.md`, `docs/adr/0042-hadith-collections-source.md` §5 (stable references), **ADR 0055** (audio rules for Names — no play button in v1); spec §1, §4, §6, §7, §12, §13, §14, §15; `docs/content-plan.md` (version table; rows updated); `.claude/agent-rules.md`; `apps/mobile/src/features/salah/data/location-cache.ts`, `prayer-times.ts`; `apps/mobile/src/features/notifications/budget.ts`, `reminder-deeplink.ts`; `apps/mobile/src/core/i18n/dates.ts`.

**Exit criterion:**
- **Hijri:** in airplane mode on iOS and Android the month view, today's date, the adjustment (−2 to +2) and the occasions work, in Arabic and English, light and dark, portrait and landscape; the device probe (H0) shows the platforms agree with each other and with the official table, or the differences are recorded.
- **Moon:** with a stored location, in airplane mode, the screen shows phase, age, illumination, conjunction, sunset, moonset and the Odeh estimate for the evening of the 29th, names its criterion and shows the «official announcements govern» sentence; with no location it sends the user to Salah and writes nothing.
- **Names:** with the `names` pack installed, the list, search, detail with references, favourites and share work offline; with the pack absent, no Menu card and no entry exists.
- No Quran text is copied into any pack; no religious text is written by us; every reference and label comes from reviewed data.
- Visual conformance against the frames, in Arabic and English, light and dark; checks per spec §14.

**Rules:** all rules in `apps/mobile/CLAUDE.md`, `apps/api/CLAUDE.md` and `.claude/agent-rules.md`; the `apple-design` skill; one component per file with a colocated `*.test.tsx`; screens only compose; layout by `useWindowClass()` / `useIsShortWindow()`, never the device; strings in `ar.json` and `en.json`; fixtures are placeholders («[الاسم]», `FIXTURE name 1 — not a name`). Agents do not add dependencies, commit or push.

## Decisions (all accepted, 3 Nov 2026)

Full text in ADR 0043 «Decisions accepted, 3 Nov 2026». Summary:

| # | Decision | Accepted answer |
| :---: | :--- | :--- |
| 1 | Which enumeration and screen text | Tirmidhī narration list; source label always shown; no Taybah-worded "scholars differ" |
| 2 | Where the 99 strings come from | Hand transcription from one named edition; edition title / hadith number / reviewer filled at step N1 before import; AlAdhan diff-only |
| 3 | Meanings and English | None in v1; Quran references + installed tafsir instead; optional HadeethEnc note (ids 10416, 64673) pending developer re-acceptance of ADR 0042-features-enabled-by-default §2 risk |
| 4 | Delivery | Pack group `names` with provenance locks |
| 5 | Learned marks | Cut (favourites and share only) |
| 6 | Hijri adjustment scope | Applies everywhere incl. Salah header (explicit exception to ADR 0032 §2); Home date pill approved |
| 7 | Occasions | 1 Muharram, 10 Muharram, 1 Ramadan, 1 Shawwal, 9+10 Dhul Hijjah, white days 13–15 |
| 8 | Hijri reminders and budget | 6 slots; Azkar falls from 21 to 15 |
| 9 | Astronomy dependency | `suncalc` 2.1.1, gated by M1; fallback `astronomy-engine` with exception |
| 10 | Criterion | Odeh (2004) primary; Yallop q optional details |
| 11 | Moon location | Read-only from Salah cache; visibility map cut |
| 12 | Navigation | Three Menu cards; routes `/asmaa`, `/hijri`, `/moon`; sidebar entries cut |
| Audio | Names audio | No play controls in v1 — see ADR 0055 |

## Release blockers

As ADR 0043 «Release blockers» (1 to 8). In accepted state, the human work that still blocks:
1. **N1 (human):** the developer names the edition (title, publisher, year, hadith number) and the transcriber; recorded in `apps/api/database/data/names/SOURCE.md` before any import runs.
2. The Quran reference map reviewed (every production row `reviewed`); content reviewer's sign-off on the source label.
3. Written confirmation or developer's recorded decision on the rights of the chosen edition.
4. Reviewed Arabic copy for the disclaimer (Moon), zone labels (Moon), calculated-calendar note (Hijri) and source label (Names).
5. Frames `AsmaaListLandscape`, `HijriCalendarLandscape`, `MoonSightingLandscape` and the expanded-window panes drawn before their UI step starts.
6. H0 device probe passed; Hermes platform differences recorded.
7. M1 gate passed (`suncalc` refraction ≤ 0.05°) and M2 criterion constants transcribed from the primary papers and reviewed.
8. Audio for Names: no blocker in v1 (no audio shipped). See ADR 0055 for the follow-up conditions.

## Mirror table: what each new screen copies from the existing app

Developer rule (2 Nov 2026): the new screens follow the same line and alignment as the rest of the app. Frames were redrawn from `quran-app-design-system.html` and the approved frames; the table says what each mirrors.

| New screen or component | Mirrors | Notes |
| --- | --- | --- |
| Pushed-screen header (back + Amiri 26 title, 16 pt gutters, top 52) on `AsmaaList`, `AsmaaDetail`, `HijriCalendar`, `MoonSighting` | `AzkarFavorites`, `AzkarFavoritesEmpty` | The 44 pt round back button, `line` hairline, `surfaceRaised` |
| Search field in `AsmaaList` | `Search` frame (48 pt pill, 14 pt padding, 17 pt text) | Not the focused (brand border) state |
| Grid/list switch in `AsmaaList` | `SegmentedControl` (design system: pill, 40 pt buttons, 15/500, selected `surfaceRaised` 600) | |
| Name card | `AzkarFavorites` row card (radius 20, `surfaceRaised`, `line`) with the gold-ring number badge | Two-column grid like the Menu grid (12 pt gap) |
| Detail hero | Home continue card (`brandSurface`, radius 24, ornament) | |
| Favourite, share, learned tiles | `AyahSheet` action tiles (radius 16, icon over label) | |
| Reference rows | `Search` verse result rows | Verse text drawn from `content.db` |
| Source block | `AzkarDetails` «المصدر» block | |
| Previous/next buttons | design-system `Button` primary and secondary (44 pt, pill, 17/600) | |
| Section titles in all screens | `Search` and Home section titles (17/600, `inkMuted`) | |
| Month header and month navigation | `AzkarCategory` title row + 44 pt icon buttons | |
| Occasion rows | `AzkarReminders` rows and the Home «الصلاة القادمة» card (raised card, chip) | |
| Adjustment sheet | design-system `BottomSheet` (radius xl, grabber 36 × 5, 8/20/20 padding) hosted by `SheetHost` (ADR 0020), like `DailyGoalsSheet` | Uses `SegmentedControl` for −2…+2, primary and secondary `Button` |
| Moon hero and times card | `Salah` hero card and `Qibla` meta panel rows | Cards `surfaceRaised`, radius 24, rows 44 pt |
| Moon no-location state | `HomeNextPrayerNoLocation`, `AzkarFavoritesEmpty` (centered icon, title, line, button) | |
| Menu cards | approved `Menu` card (ADR 0032: radius 24, `line`, icon + Amiri 22 title + 15 muted line) | Not the proposed MenuV2 shadow card |
| Home Hijri pill | Menu card chip and Home `fillSecondary` chips | See addition 3 |

**New pieces the design system lacks: additions to approve (ADR 0010).** Each is its own component file with a test, drawn only from existing tokens:
1. `HijriMonthGrid` with `HijriDayCell` and the weekday row: a 7-column grid (cell 52 pt, radius `md`, today fill `brand`, gold dot for markers, dimmed neighbour days). No calendar exists in the design system.
2. `MoonPhaseDisc`: an SVG disc and crescent (`fillSecondary`, `line`, `gold`).
3. `HomeDatePill`: a 36 pt pill (`fillSecondary`, 13/18 text, calendar glyph, chevron) under the Home header; an addition to the approved Home frame.
4. `VisibilityZoneScale`: four equal segments (28 pt, radius `sm`), the active one `brand`.
5. Four glyphs added to Iconography: names ornament (two squares, as in the Home hero ornament), calendar, moon, sliders.
6. Names/Calendar/Moon Menu cards are existing card patterns, not additions; they only add three entries.

## Frames drawn (ADR 0010)

In `quran-app-screens.html`, four new sections at the end (markers `<!--ADR0043-->`), from existing tokens only, Arabic first, RTL. Names, references and ayah text are bracketed placeholders. Hijri dates are the real Node-ICU values for Jumada I 1448 (day 1 = Monday 12 Oct 2026, 30 days); moon values are computed for Makkah on the evening of 9 Nov 2026. `npm run check:html -w @quran/design-tokens`: 300 values, 0 mismatches. Rendered with `frame-shot.py` and checked by eye.

| Frame id | Content |
| --- | --- |
| `AsmaaList`, `AsmaaListDark`, `AsmaaListEnglish` | title, search, grid/list switch, source line with info button, learned strip (decision 5), two-column cards with favourite and learned marks |
| `AsmaaDetail`, `AsmaaDetailDark` | hero, three action tiles, reference rows, source block, previous/next. No meaning section (hidden, decision 3) |
| `HijriCalendar`, `HijriCalendarDark`, `HijriCalendarEnglish` | month title and navigation, weekday row, 5-row month grid with Gregorian days, today, white-day dots, calculated-calendar note, adjust row, upcoming occasions |
| `HijriAdjust`, `HijriAdjustDark` | the sheet over the calendar: explanation, −2…+2 segmented control with +1 selected, before and after, save and reset |
| `MoonSighting`, `MoonSightingDark`, `MoonSightingEnglish` | location chip, hero with phase disc, age and illumination, times card, estimate card with criterion, zone scale and result, disclaimer, offline note |
| `MoonSightingNoLocation` | no-location state with one button that opens Salah |
| `MenuNewCards`, `MenuNewCardsDark`, `MenuNewCardsEnglish` | Menu grid with the three new cards beside the existing ones |
| `HomeHijriDate`, `HomeHijriDateDark` | the approved Home frame with the date pill added |

**Not drawn yet (block the UI step of each feature):** `AsmaaListLandscape`, `HijriCalendarLandscape`, `MoonSightingLandscape` (844 × 390, ADR 0036, grid beside the list or the hero beside the card, no rail clearance on pushed screens); the expanded-window Names detail pane and calendar panel; Names loading and empty states; a sidebar frame if decision 12 adds entries; the reminders rows inside `RemindersScreen`; the Hijri-reminder permission-denied state.

## Steps

IDs: N = Names, H = Hijri, M = Moon, X = shared. Build order: H0, H1, H2, X1 (frames approved), H3 to H6, then M1 to M7, then N1 to N7 (N1 can run in parallel with everything: it is a human task).

| # | Step | Where | Status |
| :---: | :--- | :--- | :---: |
| X1 | Frames approved; draw the missing frames | Windows | drawn, awaiting approval |
| H0 | Device probe: Hermes calendar on both platforms | iOS simulator (Mac or EAS), Android emulator | |
| H1 | Hijri engine and adjustment | Windows | |
| H2 | Occasions | Windows | |
| H3 | Calendar UI | Windows | |
| H4 | Adjust sheet, Home pill, Menu card, Salah date | Windows | |
| H5 | Reminders (optional, decision 8) | Windows | |
| H6 | Hijri exit check | all | |
| M1 | Spike and dependency gate | Windows | |
| M2 | Moon engine and criterion | Windows | |
| M3 | Location adapter (read-only) | Windows | |
| M4 | Moon UI and Menu card | Windows | |
| M5 | Moon exit check | all | |
| M6 | Visibility map | cut line, not planned | |
| N1 | Sourcing and rights (human) | developer and reviewer | |
| N2 | Reviewed data file and import (`names:import`) | Windows | schema + import done; Quran-map generator **deferred** (no Tanzil matching); needs developer 99-name JSON after N1 |
| N3 | API domain, source lock and pack | Windows | scaffolded (blocked on N1 grant + N2 data) |
| N4 | Mobile data layer | Windows | scaffolded (blocked on N1 / pack) |
| N5 | Names UI | Windows | scaffolded (blocked on N1 / pack; frames N6 polish) |
| N6 | Credits, search, share, Menu card | Windows | |
| N7 | Names exit check | all | |
| X2 | Docs sync and combined exit check | all | |

## Step briefs

Every step: stop and report if code, spec and an ADR disagree. UI tests per component cover render, variants and props, interaction, RTL, role and label (CLAUDE.md frontend rule).

### X1 — Frames

Done for the list above; the developer approves or edits. Then draw the "not drawn yet" frames before the matching UI step starts. Review rule: built UI must equal its frame, with a simulator screenshot against `frame-shot.py` output. Tests: none (design).

### H0 — Device probe

- Add a throw-away dev-only screen (not committed) that, on the iPhone 17 simulator and an Android emulator, prints for each of the 36 month starts of 1447 to 1449 AH the Hijri (year, month, day) of the Gregorian day before and after the expected start, using `en-u-ca-islamic-umalqura` numeric single-field formats, plus `resolvedOptions().calendar` and the month names in `ar` and `en`.
- Compare with the official Umm al-Qura table (KACST; the exact URL is found in this step and recorded) and between platforms.
- Output: a table of differences in the plan, the supported year range on each platform, and a yes/no on whether `formatToParts` exists. If the calendar is ignored on either platform, stop: the approach changes (an embedded month-start table).
- Tests: none; the result becomes the fixture source for H1.

### H1 — Hijri engine and adjustment

- Files in `features/hijri/data`: `hijri-date.ts` (`toHijri(date, adjust)` returning `{year, month, day}`, cached formatters, `resolvedOptions` guard), `month.ts` (`hijriMonth(year, month, adjust)`: the days, their Gregorian dates, weekday offset, length 29 or 30), `adjustment.ts` (MMKV `hijri.adjustDays`, clamp −2…+2, `useHijriAdjustment`), storage key added to `src/core/storage/mmkv.ts`.
- `core/i18n/dates.ts`: `formatHijriDate` takes the adjustment (decision 6). The Salah header changes only when the adjustment is non-zero. List this in the diff for approval.
- Clear-data resets the adjustment.
- Tests (Jest): the 36 H0 month starts; conversion round trip over 1445 to 1450; adjustment across a 29/30 month end and a year end; clamping; 30-day month detection; a day with a 23- or 25-hour Gregorian day (DST); a mocked `Intl` that ignores `calendar` yields the "unavailable" result; the budget (30 conversions under 50 ms in the test, to be re-measured on a mid-range Android).

### H2 — Occasions

- `features/hijri/data/occasions.ts`: a typed table of fixed Hijri dates (decision 7) and `upcomingOccasions(from, adjust, count)`; names in `ar.json` and `en.json`.
- No text about virtue anywhere.
- Tests: each occasion resolves to the expected Gregorian date for 1448 and 1449 (the Node-ICU values in ADR 0043 F2, replaced by H0 values); year rollover; the white days of a 29-day month; adjustment shifts the date, not the Hijri number; ordering and count.

### H3 — Calendar UI

- Components in `features/hijri/components`: `HijriMonthHeader`, `HijriWeekdayRow`, `HijriDayCell`, `HijriMonthGrid`, `HijriNote`, `HijriAdjustRow`, `OccasionRow`, `OccasionList`; screen `HijriCalendarScreen`; route `app/hijri/index.tsx` (native stack push, `pushScreenOptions`).
- Behaviour: previous and next month, a "today" return when away, week starts Saturday in Arabic and Sunday in English, Arabic-Indic digits through `arabizeDigits`; accessibility labels with the full Hijri and Gregorian date and today or occasion; the grid becomes a day list at accessibility font scales; in a short window the grid and the occasions list sit side by side; on expanded windows the occasions panel sits beside the grid.
- Tests: each component; screen test for month navigation, today, adjustment applied, RTL order of columns, labels; layout tests for short and expanded windows.
- Review against `HijriCalendar*` frames with simulator screenshots.

### H4 — Adjust sheet, Home pill, Menu card, Salah date

- `HijriAdjustSheet` (route `app/hijri/adjust.tsx`, `SheetHost`, ADR 0020), `HomeDatePill`, a Menu card `MenuHijriCard` with a live preview (today's date), and the shared `formatHijriDate` change from H1.
- Tests: sheet detents, Reduce Motion fade, save and reset write MMKV, preview before and after; Home pill label, route and hidden when Hijri is unavailable; Menu card; the Salah header test updated to cover a non-zero adjustment.
- Frames: `HijriAdjust*`, `HomeHijriDate*`, `MenuNewCards*`.

### H5 — Reminders (only if decision 8 says yes)

- `budget.ts`: `HIJRI_REMINDER_SLOTS = 6`; `AZKAR_SLOTS` recomputed (21 to 15); Azkar budget-plan tests updated.
- `features/hijri/reminders`: one date trigger per enabled occasion (the next occurrence), at a user-chosen time; Android channel `occasions` in `channels.ts`; `/hijri` added to `REMINDER_ROUTE_PREFIXES`; resync on launch, foreground when the day, time zone or adjustment key changed, and on any edit; permission only when a reminder is turned on; a row in the reminders hub (`features/reminders`, which has no ADR yet: confirm with the developer).
- Tests: off by default and schedules nothing; the adjustment moves the fire date; the slot cap refuses with the existing notice, never silently; deep link allowlist (`/hijrix` is ignored); permission denied path; clear-data cancels them.

### H6 — Hijri exit check

Airplane mode, both platforms, Arabic and English, light and dark, portrait and landscape rail, large text; adjustment visible on Salah and Home; the device matrix of spec §14 for the pushed screens. `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`.

### M1 — Spike and dependency gate

- Re-run the ADR 0043 F3 spike as committed test fixtures: 24 new moons from Nov 2026 to Oct 2028 (conjunction instants from the NASA GSFC moon-phase tables; the URL is verified in this step), 100 evenings across five latitudes, comparing `suncalc` with `astronomy-engine` (a dev-only comparison dependency, approved in decision 9) on conjunction, sunset, moonset, geometric altitude and illumination.
- Implement the inverse-refraction step for `suncalc`'s apparent altitude (a published formula, cited in the code) and require agreement with `astronomy-engine`'s unrefracted altitude within 0.05° in arc of vision.
- Run the same script in the app on Hermes (iPhone 17 simulator, Android emulator) to confirm Metro resolves `suncalc`'s `exports` and the results match Node.
- Gate: pass keeps `suncalc` (add with `npx expo install` is not applicable, it is a plain npm package: `npm install -w @quran/mobile suncalc@2.1.1`, developer approval first; then `node .github/scripts/npm-audit.mjs`; BSD-2 notice added to Sources and thanks). Fail: ask for the `astronomy-engine` exception.
- Tests: the fixtures above, in CI.

### M2 — Moon engine and criterion

- `features/moon/data`: `moon-state.ts` (phase, illumination, age, waxing), `conjunction.ts` (previous and next, by root-finding on the `phase` wrap with a bisection to 1 minute), `evening.ts` (which sunset to evaluate: the 29th of the adjusted Hijri month, or the first sunset after conjunction; moonset before or after sunset), `crescent.ts` (best time `Tsunset + 4/9·LAG`, ARCV, ARCL, semi-diameter, W, Odeh V and zone, optional Yallop q and zone), `refraction.ts`, `format.ts`.
- Constants and zone texts are transcribed from Yallop (NAO TN 69, 1997) and Odeh (Exp. Astron. 18, 2004) with the paper and page cited in comments, then checked by a reviewer. Zone labels and the disclaimer are in `ar.json` and `en.json` after the reviewer approves the Arabic.
- Tests: worked examples from both papers within tolerance; the Danjon limit; the 9 and 10 Nov 2026 Makkah cases against the ADR figures (V about −7.8 and +3.7) after refraction removal; no moonset that day; latitude beyond the fitted range returns "unavailable"; DST and time zone formatting (device zone, not the city's); a manual city in another zone; null location; speed under 100 ms for the full estimate.

### M3 — Location adapter

- `features/moon/hooks/useMoonLocation.ts` calls `peekPrayerLocation` / `loadPrayerLocation` only. No import of a Salah setter, no permission request.
- Tests: granted, denied, manual city, no location; the adapter never calls `invalidatePrayerLocation`, `requestLocationPermissions` or any MMKV write (spied).

### M4 — Moon UI and Menu card

- Components in `features/moon/components`: `MoonPhaseDisc`, `MoonSummaryCard`, `MoonTimesCard`, `MoonTimeRow`, `VisibilityEstimateCard`, `VisibilityZoneScale`, `MoonDisclaimer`, `MoonNoLocation`; screen `MoonSightingScreen`; route `app/moon/index.tsx`; Menu card `MenuMoonCard` with a live line.
- Behaviour: computed in `useMemo` after interactions; recomputed on day, location or adjustment change; zone and result are text; short window puts the hero and the estimate card side by side.
- Tests: each component; screen states (result zones A to D, unavailable, no location); the disclaimer is always present when an estimate is; RTL and signed numbers; labels.
- Frames: `MoonSighting*`, `MoonSightingNoLocation`, `MenuNewCards*`, and the landscape frame once drawn.

### M5 — Moon exit check

Airplane mode; compare ten evenings with published tables (USNO or timeanddate; the comparison and the sources recorded); both platforms; a landscape pass; large text.

### M6 — Visibility map (cut line)

Not planned. If chosen later it needs its own ADR addendum: Natural Earth basemap asset, grid evaluation off the render path, an accessible table, frames. About two weeks.

### N1 — Sourcing and rights (human)

- The developer and the reviewer: pick the list (decision 1), the edition and the transcriber (decision 2), the label wording, and the optional HadeethEnc note (decision 3).
- Record in `apps/api/database/data/names/SOURCE.md`: edition, publisher, year, hadith number, who transcribed, who reviewed, date. No AI transcription, no copy from a third-party JSON.
- Optional: write to one publisher for permission; record the answer in `docs/content-plan.md` "Permissions to request".
- Output: the reviewed data file (N2 reads it). Tests: a checklist, not code.

### N2 — Reviewed data file and import

**Status (3 Nov 2026):** JSON schema documented in `apps/api/database/data/names/SCHEMA.md`; shell `tirmidhi.json` (empty `names` until N1); `names:import` loads the file when `content_sources` is `granted`. Quran-map generator and `names-quran-map.json` are **deferred** (developer: no Quran-side work on this branch); `names_verses` stays empty until a later step.

- `apps/api/database/data/names/<list>.json` — see `SCHEMA.md` (99 rows: `position`, `name_slug`, `name_ar`; list metadata in `list`).
- `php artisan names:import {path?} {--dry-run}` — refused while source is `pending`; validates exactly 99 names; derives `text_search`; fingerprint skip when bytes unchanged.
- Tests (Pest): pending refuses; granted fixture import; empty shell invalid; no divine Arabic in fixtures (placeholders only).

**Still cut / later:** `names-quran-map.json`, `php artisan names:quran-map-candidates`, production `reviewed` verse rows (ADR 0043 A4).

### N3 — API domain, source lock and pack

- `apps/api/app/Domains/Names` (importer, validator, pack tables), a reviewed migration adding the `content_sources` row (`pending`) and, once decisions 1 to 3 are recorded, a second reviewed migration setting it `granted` citing ADR 0043; `ResourceGroup`, `ServedResourceGroup`, `PackSchema` gain `names`; pack builder refuses unless `granted`; fingerprint guard so an unchanged source does not bump the version; rollback by migration.
- Contract: if the manifest enum is in OpenAPI, run `npm run generate -w @quran/api-contract` and commit `openapi.json` and `src/schema.d.ts`.
- Tests (Pest): import idempotent with the guard; locked source writes nothing and builds no pack; production refuses unreviewed rows; pack contains no Quran text and no translation columns; architecture tests for layering; the manifest hides the pack when its file is missing. `composer qa`.

### N4 — Mobile data layer

- `content.db` migration for `names_lists`, `names`, `names_verses`, `names_notes`; `PackGroup` gains `names`; `features/names/data`: repository (list, by slug, references with `verses` joined, search over `text_search`), `useNamesAvailable()`.
- `user.db` additive migration: `names_favorites` (and `names_learned` if decision 5); both in `PERSONAL_TABLES`; MMKV `names.viewMode`.
- Tests: repository queries on a placeholder pack; search normalisation («ال» optional, hamza forms); favourites keyed by `name_slug` survive a re-import with a different list order; clear-data empties both tables; the 6,236-ayah checksum test still passes (nothing here touches `verses`).

### N5 — Names UI

- Components in `features/names/components`: `NameCard`, `NamesGrid`, `NamesList`, `NamesViewSwitch`, `NamesSearchField`, `NameSourceLine`, `NameHero`, `NameActions`, `NameReferenceRow`, `NameSourceBlock`, `NamePager`; screens `NamesListScreen`, `NameDetailScreen`; routes `app/asmaa/index.tsx` and `app/asmaa/[slug].tsx`; expanded windows render the detail in the side pane (`AdaptiveSplit`).
- **No audio controls.** No play button, speaker icon or audio-related prop anywhere in Names components or screens (ADR 0055 §5). An architecture test asserts that `features/names` does not import `azkarPlayerStore` or any audio hook.
- References open `/read/<verseKey>`; a section with no data (no notes, no references) is not drawn; no placeholder sentences.
- Tests: each component; list and grid, search, empty and not-installed states; detail with and without references; share text equals the name plus the source line; RTL; accessibility labels; short-window and expanded layouts; assert no audio-related element renders.
- Frames: `AsmaaList*`, `AsmaaDetail*`, and the landscape and expanded frames once drawn.

### N6 — Credits, search, share, Menu card

- Sources and thanks entries from `content_sources` (names list, HadeethEnc if used, `suncalc` BSD-2 notice, platform calendar note); the Menu card `MenuNamesCard` shown only while the pack is installed (ADR 0017); no global-search scope in v1 (cut line); deep link `/asmaa/<slug>` for later.
- Tests: card visibility with and without the pack; credits list; share.

### N7 — Names exit check

Airplane mode with the pack installed; pack removed (no entry); Quran references checked against the reviewer's map; the reviewer signs off the label and the data; device matrix; `composer qa` and the mobile checks.

### X2 — Docs sync and combined exit check

Apply the spec edits listed in ADR 0043 (§4, §6, §7, §12, §13), set the ADR to accepted, correct ADR 0030 §6, add the Menu cards to ADR 0032 §3, update the content plan row statuses. Run the full matrix of spec §14 once for the three features.

## Cut lines

| Item | Saves | Note |
| --- | --- | --- |
| Visibility map (M6) | about 2 weeks | Not needed for the evening estimate |
| Learned marks and progress strip | about 3 days | Spec §1 says hifz progress is not in v1 |
| Hijri reminders (H5) | about 4 days and the budget carve | Calendar and occasions stay |
| Yallop q details line | 1 day | Odeh stays |
| Global-search scope for names | 2 days | Names has its own search |
| Sidebar entries and expanded panes | 3 days | Home pill and deep links remain |
| Whole of Names if sourcing is not settled | the largest block | Hijri and Moon do not depend on it |

## Risks

- **Sourcing the names (highest).** No licensed dataset exists; transcription needs a named edition, a reviewer, and the developer's reading of the rights. Mitigation: the lock (`pending` until recorded), the pack kill switch, the cross-check diff.
- **Scholarly dispute on the enumeration.** The label and any wording are religious copy for the reviewer; the app never words it itself.
- **Platform Umm al-Qura tables differ** between iOS and Android and from the official table at some month boundaries (H0 measures; the adjustment mitigates).
- **Refraction and criterion constants.** `suncalc` returns refracted altitude; web sources disagree on Odeh zone wording; the papers were not readable here. M1 and M2 gate on it.
- **Shared-budget change** (Azkar 21 to 15) touches working Azkar code.
- **Concurrent edits.** The working tree already holds uncommitted Azkar, reminders-hub and widgets changes; `budget.ts`, `mmkv.ts`, `app.config` and `quran-app-screens.html` (one Qibla line) changed while this plan was written. Rebase the budget and storage edits on whatever is committed first.
- **Numbering.** Two ADRs are numbered 0042; spec §15 still calls Phase 7 "Beta" while `docs/plans/phase-7.md` is Hadith.
- **Time zones for a manual city.** Times show in the device zone, as the prayer times do.

## Open questions

1. Arabic wording for the zone labels, the disclaimer, the calculated-calendar note and the source label (reviewer).
2. Month names from `Intl` or from `ar.json` (decided by H0).
3. Whether the reminders hub gets an ADR before H5.
