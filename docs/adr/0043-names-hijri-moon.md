# 0043 — أسماء الله الحسنى, the Hijri calendar and moon sighting

Date: 2026-11-02 · Status: **accepted (developer, 3 Nov 2026)** · All 12 decisions accepted; see «Decisions accepted, 3 Nov 2026» · Audio for Names deferred to ADR 0055 · Rests on ADR 0010 (frames first), 0014 (no Quran translations), 0017 (Home tiles follow shipped features), 0027 (local-only), 0030 (Salah on device; §6 Hijri date), 0031 (sourcing and provenance rules), 0032 (Menu), 0034 (Home, reminders), 0036 (short window), 0042-features-enabled-by-default (no env switches; rollback by reviewed change), spec §1, §4, §6, §7, §12, §13, §14, §15, `docs/content-plan.md` · Amends spec §4, §6, §7, §12, §13, §15 and the content plan · Plan: `docs/plans/names-hijri-moon.md`

Numbering note: `docs/adr/` already holds two files numbered 0042 (`0042-features-enabled-by-default.md` accepted, `0042-hadith-collections-source.md` proposed). This ADR takes 0043 and cites them by full file name. The developer may want to renumber one of them.

## Context

The developer asked (2 Nov 2026): «add 99 names of Allah, Hijri calendar, moon sighting».

What the app already holds (read from the files, not assumed):
- **Hijri date, on device.** `formatHijriDate` in `apps/mobile/src/core/i18n/dates.ts` formats with `Intl.DateTimeFormat` and the `islamic-umalqura` calendar (ADR 0030 §6). Only the Salah header shows it today (`features/salah/components/SalahDateHeader.tsx`; the `#Salah`, `#SalahDark` and `#SalahAzkar` frames). The Home frames (`#Main`, `#HomeDark`, `#HomeEnglish`) show no Hijri date.
- **Prayer engine and location.** `features/salah/data/prayer-times.ts` (`adhan` 4.4.6, Umm al-Qura method) and the shared location read `features/salah/data/location-cache.ts` (`peekPrayerLocation`, `loadPrayerLocation`; one read serves Home, Menu, Salah and Qibla). The gazetteer (`cities.ts`) has latitude and longitude but no time zone.
- **Notification budget.** `features/notifications/budget.ts`: iOS limit 64 = daily reminder 1 + prayer 40 + Friday 1 + misbaha 1 + Azkar 21 (the file changed on 2 Nov while this ADR was written; the reminders hub, `features/reminders`, is in the working tree and not yet in an ADR).
- **Content-pack machinery.** The `azkar` pack group, its provenance model and its locks (ADR 0031 §3, §9, §11; ADR 0042-features-enabled-by-default §8, §9) and the stable-reference rule of ADR 0042-hadith-collections-source §5.
- **Menu and Home.** Menu is a two-column card grid (ADR 0032); Home tiles appear only when their feature exists (ADR 0017).

## Findings (research, 2 Nov 2026)

### F1. Names of Allah: no dataset with a clear licence and a named list
- **GitHub JSON copies.** A search of GitHub for "99 names of allah json" and "asmaul husna json" returned about 20 repositories. Nearly all have **no licence file** (`license: null`, so all rights reserved by default). The few with a licence are tiny, unsourced re-typings: `wnr-code/asmaul_husna` (MIT, Indonesian), `MuhammadAhsan-Shafiq/99-Names-of-Allah-JSON` (`NOASSERTION`). None names the list it follows or the edition it was typed from. Pub.dev packages `esmaulhusna_muslimbg` and `asmaulhusna` are MIT, with the same gap.
- **AlAdhan** (`https://api.aladhan.com/v1/asmaAlHusna`, `https://aladhan.com/credits-and-terms`). Reachable; returns 99 objects with `name`, `transliteration`, `number` and `en` (a short English meaning). The terms page says only "WITHOUT ANY WARRANTY" and credits calculation sources; it states **no licence for this data and names no source for the list or the meanings**. The repository `islamic-network/api.aladhan.com` is not public. The content plan calls AlAdhan "Primary for the Hijri date and Asma al-Husna" (`docs/content-plan.md`, Prayer times table); that row cannot stand for stored data (see Decision A2).
- **islamic.app API** (`docs.islamic.app/api-reference/asma-al-husna`): Arabic, transliteration, English and Spanish meanings, no licence stated.
- **Wikidata** item Q83875 «99 names of Allah»: community-built; a SPARQL count of linked items returned 29 for `part of` and 118 for `instance of`, so it is not a reliable 99-list.
- **HadeethEnc** (`hadeethenc.com/api/v1`, already a granted-by-decision source for Azkar notes, ADR 0042-features-enabled-by-default §2). Category 74 «توحيد الأسماء والصفات» (89 hadiths) holds two records about the **number** of the names, ids **10416** and **64673** (matched by title). Each carries Arabic text, attribution, grade, explanation, hints, word meanings, reference and about a dozen translations. **Neither contains an enumerated list** (the text field is about 140 characters). HadeethEnc therefore sources the *virtue-of-counting* note, not the names.
- **Dar al-Ifta (Egypt)** fatwa 17315 and the other scholarly pages found discuss the report, but no site found publishes the list as reusable data under a stated licence.
- **Scholarly point (from search results, not from my own knowledge).** The report of the number of names is established; the **enumeration** found in the Tirmidhi narration (and in Ibn Majah, with differences in order and content) is graded weak by several scholars, and Ibn Hajar is reported to have judged the enumeration an insertion by a narrator. The lists in circulation therefore differ. I could not find Ibn Uthaymeen's position in the search results and do not attribute one to him; the reviewer must check his writings (القواعد المثلى and the sharh of al-Aqeedah al-Wasitiyyah) before any list is labelled with his name. Every claim in this paragraph needs the content reviewer's check before it is shown to users.

**Consequence:** the 99 Arabic strings cannot be taken from any dataset found. The names are classical text, but the *selection and sequence* a modern site publishes can carry its own rights, and none of them states terms. They must come from a named source, recorded with provenance, by a human (never generated, never copied from a third-party JSON of unknown origin).

### F2. Hijri conversion on device: no library is needed
- **Hermes does not bundle ICU; it calls the platform.** `facebook/hermes` `doc/IntlAPIs.md`: «We decided to consume the Android and iOS platform provided facilities»; `Intl.DateTimeFormat` supports `format`, `resolvedOptions` and `supportedLocalesOf` on both platforms. This **corrects ADR 0030 §6**, which says "ICU on both Hermes platforms": on iOS the engine calls Foundation (`NSDateFormatter`/`NSCalendar`), on Android `android.icu`.
- **Calendar plumbing, read in source (`facebook/hermes` main):** `lib/Platform/Intl/PlatformIntlApple.mm` takes the `calendar` option, treats `ca` as a relevant Unicode extension key, and builds `[[NSCalendar alloc] initWithCalendarIdentifier:...]` from it; `lib/Platform/Intl/java/.../DateTimeFormat.java` does the same through `ca`. So `en-u-ca-islamic-umalqura` and `ar-SA-u-ca-islamic-umalqura` reach the platform calendar on both. iOS does not honour `numberingSystem` (the app already converts digits with `arabizeDigits`). iOS `NumberFormat.formatToParts` is unimplemented; `DateTimeFormat.formatToParts` exists in the Apple source but I did not confirm it is exposed to JS in the Hermes that RN 0.88.1 pins, so the plan does not depend on it (numeric single-field formats instead).
- **Not verified, and said so:** the Hermes build RN 0.88.1 pins (`node_modules/react-native/sdks/hermes-engine` carries no version file), the Apple raw value of `NSCalendarIdentifierIslamicUmmAlQura` (`islamic-umalqura`, from memory), and behaviour on a device. ADR 0030 §6 shows the header already renders on both platforms, which is evidence the path works. **Plan step H0 is a device probe** (the 36 month starts of 1447–1449 on the iPhone 17 simulator and an Android emulator, compared with each other and with the official table).
- **Measured on Node 24 (full ICU), 2 Nov 2026:** Jumada I 1448 starts Monday 12 Oct 2026 and has 30 days, so 22 Jumada I = Monday 2 Nov 2026. Ramadan 1448 starts 8 Feb 2027; Eid al-Fitr 9 Mar 2027; Day of Arafah 15 May 2027; Eid al-Adha 16 May 2027; Islamic new year 1449 on 6 Jun 2027; Ashura 15 Jun 2027. 30 days × 3 formats took 13 ms including formatter creation. These are Node's ICU values, not Hermes's; they seed the frames and the test fixtures only after H0.
- **Maintained libraries (npm registry, 2 Nov 2026):** `moment-hijri` 3.0.0 (2024-10-31, MIT, needs moment), `@tabby_ai/hijri-converter` 1.0.5 (2023-08-24), `@umalqura/core` 0.0.7 (2019-07-18), `hijri-converter` 1.1.1 (2018), `hijri-date` 0.2.2 (2017), `hijri-js` 1.0.25 (2017). **None has a release in the last 12 months**, so none may be added (CLAUDE.md, content plan "No abandoned packages"). Platform `Intl` is also what the shipped Salah header already uses.
- **Risk:** the two platforms ship their own Umm al-Qura tables, which can differ from each other and from the KACST/Umm al-Qura official table at a month boundary. The user adjustment (B2) is the answer for the user; H0 measures the difference.

### F3. Astronomy: one library meets the 12-month rule, and the spike supports it
| Library | Version, last release | Licence | Notes |
| --- | --- | --- | --- |
| `suncalc` | 2.1.1, **2026-10-05** (2.0.0 on 2026-06-18, a precision rewrite) | BSD-2-Clause (repo `LICENSE`; the npm metadata has no `license` field, so check the lockfile entry) | 56 KB unpacked, no dependencies. Moon position (apparent altitude, azimuth, distance), illumination (fraction, phase, waxing), moonrise/moonset/transit, sun times. README accuracy: moon position ~0.09°, rise/set ~15 s. |
| `astronomy-engine` | 2.1.19, **2023-12-14** (GitHub last push 2025-01-27) | MIT | 1.8 MB unpacked, no dependencies. Search for moon phases, rise/set, geometric or refracted altitudes. **Fails the 12-month rule.** |
| `astronomia` | 4.2.0, 2025-08-30 | MIT | 18.6 MB unpacked (data tables). Fails the rule and is heavy. |
| `@observerly/astrometry` | 0.71.0, 2026-11-01 | MIT | Pre-1.0 with a fast-moving API. Not chosen. |
| `ephemeris` | 3.2.1 | GPL-3.0 | Rejected (licence). |

**Spike (scratch directory, not in the repo, Node 24):** `suncalc` 2.1.1 against `astronomy-engine` 2.1.19 for the new moon of 9 Nov 2026, Makkah.
- Conjunction: the instant `suncalc`'s `phase` wraps from 1 to 0 equals `astronomy-engine`'s `SearchMoonPhase(0)` at one-minute scan resolution for **six consecutive new moons** (Nov 2026 to Apr 2027). Example: 2026-11-09 07:02 UTC.
- Sunset: within 1 s. Moonset: within 3 s. Moon altitude at sunset on 10 Nov: 6.871° against 6.870°. Illumination at sunset: 0.0029 and 0.0187 in both.
- Near the horizon the two differ by 0.157° (−1.541° against −1.384° on 9 Nov), which is a refraction-convention difference: `suncalc` returns **refraction-corrected** altitude only. The Odeh and Yallop criteria are defined on **geometric** arc of vision, so the engine must remove refraction (inverse of a published formula) and test the result against `astronomy-engine` before the library is accepted. This is the one technical reason the decision could flip to `astronomy-engine`; plan step M1 is the gate.
- Speed: 2,000 `getMoonPosition` calls took 14 ms on Node.

### F4. Criteria
- **Yallop (1997, HM Nautical Almanac Office Technical Note 69):** `q = (ARCV − (11.8371 − 6.3226·W + 0.7319·W² − 0.1018·W³)) / 10`, with ARCV the geocentric arc of vision at the **best time** `Tb = Tsunset + (4/9)·LAG` (LAG = moonset − sunset) and W the topocentric crescent width in arcminutes. Zones: A q > +0.216; B > −0.014; C > −0.160; D > −0.232; E > −0.293; F below that (same source, Utrecht HMNAO page `islam_lunvis_method.htm`).
- **Odeh (2004, Experimental Astronomy 18:39–64, 737 observations):** `V = ARCV − (−0.1018·W³ + 0.7319·W² − 6.3226·W + 7.1651)` with **topocentric** ARCV and W. Zones as published by a library that transcribes it: A V ≥ 5.65 (naked eye), B V ≥ 2.00 (optical aid, may be seen with the naked eye), C V ≥ −0.96 (optical aid only), D below (not visible even with optical aid). A Danjon limit (ARCL below about 6.4°) is also applied by that library.
- **The web sources disagree on wording and I could not read the Odeh paper.** The primary papers must be read and the constants and zone texts transcribed from them in step M2, with a reviewer's check. The numbers above are for planning only.
- **Prototype run (suncalc, 9–10 Nov 2026, refraction not yet removed, so only indicative):** Makkah 9 Nov V ≈ −7.8 (moonset 6 min before sunset; zone D); Makkah 10 Nov V ≈ +3.7 (zone B); Cairo 10 Nov V ≈ +1.7 (zone C); Jakarta 10 Nov V ≈ +6.4 (zone A). The Umm al-Qura calendar gives Jumada I 1448 thirty days, which is consistent with the 9 Nov Makkah result.

### F5. A visibility map
Feasible offline, not cheap. A 5° grid is 72 × 36 = 2,592 points; at the measured ~0.007 ms per position call a full grid evaluates in well under a second in JS. The cost is elsewhere: a coastline basemap (Natural Earth is public domain, a simplified polygon set is about 100 to 200 KB) drawn with `react-native-svg` (already a dependency), a colour legend that is not colour-only, an accessible table alternative for VoiceOver and TalkBack, RTL and dark variants, and a refresh rule. About two focused weeks. It is not needed to answer «will it be visible where I am», so it is a cut line (below).

## Decisions that need the developer

Each item has my recommendation. Nothing is decided here.

1. **Which enumeration, and what the screen says about it (religious interpretation).** Recommend: the narration list of Jami' at-Tirmidhi, labelled on every screen with its source name («القائمة: …») and an info button that opens the source. Any sentence saying scholars differ on the enumeration must come from a named, permitted source and be reviewed. If none is approved, the app shows the source label only; it never words that claim itself.
2. **Where the 99 strings come from (licensing).** Recommend: hand transcription by the developer or the content reviewer from one named edition of the narration, with edition, hadith number and reviewer sign-off recorded as provenance, then cross-checked by a script against AlAdhan (a diff report only, never stored). No GitHub JSON, no generated text. I read the names as unprotected classical text, but that is a legal reading and is the developer's to accept. Alternative: ask a publisher (Dar al-Ifta, Islamweb, Islamhouse) for written permission; slower.
3. **Meanings and English.** Recommend: **none in v1.** The meaning field stays null and its section hidden (ADR 0031 §1.4), as does English. In its place the detail screen offers the Quran references, each opening the app's own reader and, from there, the tafsir the user has already installed (licensed, displayed unmodified). Optional: HadeethEnc records 10416 and 64673 as an «about the names» note with attribution, under the same accepted-risk decision as ADR 0042-features-enabled-by-default §2 (the developer decides whether to repeat that acceptance).
4. **Delivery of the names data.** Recommend a new pack group `names` through the existing manifest and pack builder, with the Azkar-style provenance rows and locks, rather than a bundled JSON. Reasons: the rights of the source are unsettled and a pack can be withdrawn without an app release (ADR 0042-features-enabled-by-default §9); credits come from `content_sources`; a licensed meaning or a corrected spelling can be added later. Cost: about three extra steps. Fallback if speed matters: bundle the same JSON shape in the app (names only, about 15 KB), and accept an app update for any change. Non-negotiable 3 (no QF data in the binary) is not affected either way because this is not QF data.
5. **Learned marks («تعلّمته»).** Spec §1 lists hifz progress as "not in v1". Recommend: ship favourites and share only; leave learned marks and the progress strip as a cut line.
6. **Hijri adjustment scope.** Recommend: one stored adjustment (−2 to +2 days, MMKV) applied by the shared `formatHijriDate`, which **also changes the Salah header** when the adjustment is not zero. ADR 0032 §2 says the Salah feature must not change, so this needs your explicit approval; refusing leaves two screens disagreeing about today's date. Also approve or reject the new **Home date pill** (an addition to the approved Home frame; frames `HomeHijriDate`, `HomeHijriDateDark`).
7. **Occasions (religious interpretation).** Recommend only fixed, uncontested calendar markers: 1 Muharram (new year), 10 Muharram, 1 Ramadan, 1 Shawwal (Eid al-Fitr), 9 Dhul Hijjah (Day of Arafah), 10 Dhul Hijjah (Eid al-Adha) and the days 13–15 of each month (الأيام البيض). **Excluded pending your ruling:** the 12th of Rabi' I, the 27th of Rajab, mid-Sha'ban, Laylat al-Qadr and any day a scholarly dispute touches. Names are calendar labels with no text about virtue.
8. **Hijri reminders and the shared budget.** Recommend: optional reminders for the six annual occasions only (one pending notification each, the next occurrence), off by default, no white-day reminder (13 of 12 months would use too many slots). That needs `HIJRI_REMINDER_SLOTS = 6` in `budget.ts` and reduces `AZKAR_SLOTS` from 21 to 15, which changes the Azkar budget tests. Alternative: ship the calendar with no reminders (cut line).
9. **Astronomy dependency.** Recommend `suncalc` 2.1.1 (BSD-2-Clause, 5 Oct 2026), subject to the M1 gate. If M1 shows refraction removal cannot reach 0.05° agreement with `astronomy-engine`, the fallback is `astronomy-engine` 2.1.19, which needs a documented exception to the 12-month rule (as ADR 0011 accepted for Amiri). `astronomy-engine` would be a dev-only comparison dependency during M1 either way.
10. **Criterion and wording.** Recommend Odeh (2004) as the single displayed criterion (it uses topocentric inputs, which a library gives directly, and a larger dataset), with Yallop's q kept in an optional details line. The zone labels and the sentence «official announcements govern» need reviewed Arabic copy; the frames carry my draft.
11. **Moon location and the map.** Recommend: the Moon screen reads Salah's location and never writes it; with no location it sends the user to Salah (frame `MoonSightingNoLocation`). The visibility map is a cut line.
12. **Navigation and schedule.** Recommend: three Menu cards (frames `MenuNewCards*`), routes `/asmaa`, `/hijri`, `/moon`, no new tab. On expanded windows the sidebar has no Menu tab (ADR 0032 §4), so the three features are reachable there only through the Home pill and deep links unless you approve sidebar entries (needs its own frame; not drawn). Order: Hijri calendar first (no rights risk), then Moon, then Names (gated on decisions 1 to 4). It is a follow-up, not a phase; it does not change Phase 6.

## Decision

### A. أسماء الله الحسنى

**A1. One list, labelled.** The data holds a `names_lists` row (slug, Arabic title, source label, attribution, permission status, edition and hadith reference of the transcription) and 99 `names` rows. The on-screen source line is built from that row. A second list can be added later without changing user data (A6).

**A2. Sources and locks (mirror of ADR 0031 §1 and ADR 0042-features-enabled-by-default §8, §9).**
- The names file is a reviewed repository file (`apps/api/database/data/names/<list>.json`). Arabic is stored byte-for-byte. Only `text_search` is derived (diacritics and tatweel removed, alef forms unified, ى to ي, ة to ه; the optional leading «ال» is handled at query time).
- The import refuses to write unless the `content_sources` row for the list is `granted`, set by a reviewed migration that cites this ADR and the recorded decision. No environment switch is added (ADR 0042-features-enabled-by-default).
- The pack builder refuses a `names` pack unless the same row is `granted`. Rollback is a reviewed migration setting it back to `pending`.
- **No dataset is imported**: AlAdhan and the GitHub files are cross-check inputs at most, produced as a diff report and never stored. The content plan's "AlAdhan: Primary for Asma al-Husna" row is amended (see "Edits").
- A fingerprint guard compares the source hash before bumping the resource version, so a release does not force every device to re-download (the gap ADR 0042-features-enabled-by-default records for Azkar).

**A3. Fields and hidden sections.** `name_ar` (source bytes), `position` (in that list), `name_slug` (ASCII, reviewed, stable identifier), `text_search`. Notes live in `names_notes` (kind, text, `source_*`, `review_status`), shipped **empty** until a licensed, named source exists; a section with no sourced note is not drawn. English and transliteration columns are not created in v1. Fixtures use placeholders («[الاسم]», `FIXTURE name 1 — not a name`).

**A4. Quran references.** `names_verses (name_slug, verse_key, review_status, evidence)`. A generator proposes candidates by word-boundary matching of the normalised name against `verses.text_search` from the bundled Tanzil text, with an exclusion list for ordinary words and non-divine uses, and writes `candidate` rows. **Production accepts only `reviewed` rows** (the ADR 0031 §11 rule). The app renders each reference from `content.db.verses` in the Quran font; no Quran text is copied into the pack, and no translation or transliteration is shown (ADR 0014). The number of references per name is not claimed here: it depends on the reviewed map.

**A5. Delivery (decision 4).** Pack group `names`: `ResourceGroup`, `ServedResourceGroup`, `PackSchema` and the app's `PackGroup` gain one value; `resources.group` is a `string(64)` column so no migration for it (ADR 0042-hadith-collections-source §7). `content.db` gains `names_lists`, `names`, `names_verses`, `names_notes` (a content.db change is delete-and-reimport, spec §6). The Home and Menu entries appear only while the pack is installed (ADR 0017).

**A6. User data.** `user.db`: `names_favorites (name_slug, created_at)` and, only if decision 5 is yes, `names_learned (name_slug, learned_at)`. References use **`name_slug`, never the list position**, so a change of list keeps favourites (the ADR 0042-hadith rule). Both tables join `PERSONAL_TABLES` so «مسح البيانات» clears them. MMKV: `names.viewMode` (grid or list).

**A7. UI.** List (grid or list), search over `text_search`, detail with the reference rows, favourite, share (the Arabic name and the source line, nothing appended, as Azkar share), Menu card, and on expanded windows the detail renders into the side pane like ayah and tafsir (`AdaptiveSplit`). The «المصدر» line is always shown (decision 1).

### B. التقويم الهجري

**B1. Conversion.** `Intl.DateTimeFormat` with `islamic-umalqura`, one cached formatter per field and locale, numeric single-field formats parsed to `{year, month, day}`; no library. A `resolvedOptions().calendar` check at first use falls back to "Hijri unavailable" (the section hides) rather than showing a wrong date. The Gregorian-to-Hijri conversion is memoised per local day.

**B2. Adjustment.** One integer −2…+2 in MMKV (`hijri.adjustDays`), applied by shifting the Gregorian instant before conversion. The sheet (frame `HijriAdjust`) previews the date before and after. It is never applied to prayer times, astronomy, notifications' fire times or any data other than the displayed and counted Hijri date (and occasion dates).

**B3. Month view.** Hijri month with the Gregorian day under each cell (frame `HijriCalendar`); Saturday-first in Arabic, Sunday-first in English; today, occasion markers and white days; previous/next month; a note that the date follows the calculated Umm al-Qura calendar and can differ from the country's announcement. The Hijri range is bounded to the platform table (1300–1600 AH on ICU; H0 records Apple's bounds).

**B4. Occasions** (decision 7). A static table of fixed Hijri dates, resolved to Gregorian by scanning the month. No religious text, no virtue wording, no source needed beyond the calendar.

**B5. Reminders** (decision 8). Off by default; permission asked only when a reminder is turned on; channel `occasions`; one date trigger per enabled occasion (the next occurrence); rescheduled when the adjustment, the time zone or the day changes; shared budget; deep link `/hijri/` added to the allowlist in `reminder-deeplink.ts`.

### C. رؤية الهلال

**C1. Always an estimate.** Every screen states that it is an astronomical estimate and that **official announcements govern**. The screen names its criterion. No sentence says that a month has started or will start. The Hijri calendar is never changed by this feature.

**C2. What is computed on device** (`features/moon/data`): phase and illumination (`suncalc`), age since the last conjunction, the next conjunction (root-finding on the `phase` wrap), moonrise/moonset/sunset at the user's location, and, for the **evening of the 29th** (the sunset that ends the 29th of the current adjusted Hijri month, or the first sunset after conjunction when that is a different day), the Odeh V and zone with the inputs listed (best time, ARCV, ARCL, W). Edge cases: a moon that does not set, latitude beyond the range in which the criteria were fitted (shown as «غير متاح»), and the Danjon limit.

**C3. Disclaimer.** The sentence in the frame is required; its Arabic wording is for the reviewer.

**C4. Location.** Read only: `peekPrayerLocation` and `loadPrayerLocation` from the Salah cache, no write, no permission prompt of its own. Times are shown in the device time zone (the gazetteer has none), with the same limitation as the prayer times for a manual city in another zone; a test pins it.

**C5. Map.** Not in scope (decision 11, F5).

### D. Cross-cutting

- **Offline.** Nothing calls the network except the one-time `names` pack download. Hijri and Moon work in airplane mode (non-negotiable 4). Every personal write goes to MMKV or `user.db` first.
- **Accessibility.** Every calendar cell has a label with the Hijri date, the Gregorian date and today or the occasion; the weekday header is decorative. Moon zone and result are text, never colour only. At accessibility font scales the month grid becomes a day list. Reduce Motion: no animated moon; Reduce Transparency: unchanged (no glass on these screens). Touch targets 44 pt.
- **RTL and numerals.** Arabic first (`dir="rtl"`, Arabic-Indic numerals through `arabizeDigits`), English LTR with Latin digits; signed numbers are isolated (`bdi`), as the frames do. All strings in `ar.json` and `en.json`; the 12 Hijri month names come from `Intl` as the Salah header does (alternative: own i18n names, a smaller risk of platform differences; the H0 probe decides).
- **Light and dark.** Tokens only (`useTheme()`); frames drawn in both.
- **Window size and landscape (ADR 0036).** Pushed screens, not tab screens, so no rail clearance. In a short window (`useIsShortWindow()`): the month grid and the occasions list sit side by side; the Moon hero and the estimate card sit side by side; the Names grid keeps two columns and a scroll. Expanded windows (`useWindowClass()`): the Names detail in the side pane; the calendar grid beside the occasions panel. These landscape and expanded frames are **not drawn yet** and block their UI step (plan X1).
- **Performance budgets** (measured on Node, to be re-measured on a mid-range Android in the release build): month grid under 50 ms; moon evening estimate under 100 ms off the render path; Names list first paint under 100 ms (99 rows, a FlashList with two columns); cold start unchanged (nothing here runs before first paint).
- **Tests (spec §14).** Jest for the engines, repositories, components and screens (render, variants, interaction, RTL, role and label); Pest for the importer, locks, pack builder and architecture; contract regeneration if the manifest enum is exposed in OpenAPI; a device matrix pass (iPhone SE-size, Pro Max-size, iPad portrait, landscape rail, Android phone, foldable) with Maestro flows for open, rotate, adjust and no-location; every flow in Arabic and English. Details per step are in the plan.

## Consequences

- A third pack group and about 14 new user-visible screens and sheets to maintain; the Hijri calendar adds none of the rights risk.
- `formatHijriDate` becomes adjustment-aware, so the Salah header can change (decision 6).
- The Azkar reminder budget falls from 21 to 15 if the Hijri reminders ship (decision 8).
- A new runtime dependency (`suncalc`) with a BSD-2 notice to credit (the Sources and thanks screen) unless M1 flips the choice.
- Names ship only after the list, its source and its Quran map are reviewed. Until then the code can land dormant: no pack, so no Menu card and no entry (ADR 0017).
- No religious text is generated anywhere: names, references and the source label come from reviewed data, and the only new prose is calendar and astronomy labels, the disclaimer and the occasion names, all for the reviewer.

### Release blockers
1. The list and its source named and approved (decisions 1 and 2), the 99 strings transcribed with recorded provenance and signed off by the reviewer.
2. The Quran reference map for the names reviewed (every production row `reviewed`).
3. Written confirmation, or the developer's recorded decision, on the rights of the chosen source.
4. The frames approved by the developer, including the landscape and expanded frames still to draw.
5. The Hijri device probe (H0) passed on iOS and Android, and the platform differences from the official table recorded.
6. Explicit developer approval of the Salah header change (decision 6) or its refusal recorded.
7. The Moon criterion constants and zone texts transcribed from the primary papers and checked by a reviewer; the M1 library gate passed on a Hermes build.
8. Reviewed Arabic copy for the disclaimer, the zone labels, the source label and any "scholars differ" sentence.

## Edits this ADR implies (not made, except where stated)

- **Spec §4:** routes `asmaa/`, `hijri/`, `moon/`; features `names`, `hijri`, `moon`. **§6:** `content.db` names tables, `user.db` `names_favorites`, `names_learned`. **§7:** pack group `names` (and the azkar-style note). **§12:** three feature paragraphs. **§13:** `HIJRI_REMINDER_SLOTS` and the `occasions` channel. **§15: a proposed follow-up pointer — made now** (a new paragraph after the widgets pointer; the current phase is unchanged).
- **Content plan:** proposed rows for the sources and libraries — **made now** (status `proposed`), plus a note that the AlAdhan "Primary" row for Asma al-Husna conflicts with A2 and ADR 0030 §6. The row itself is not changed until the developer decides.
- **ADR 0030 §6:** a one-line correction (Hermes uses platform facilities, not bundled ICU) once H0 confirms it.
- **ADR 0032:** three cards added to the list in §3, and its §2 amended if decision 6 is approved.

## Developer decisions (2 Nov 2026)

Partial acceptance on the day the ADR was written. Superseded in full by the 3 Nov 2026 section below; kept for the record.

1. **99 Names source:** the al-Tirmidhi narration list, always shown with its source. The developer names the printed edition. An agent transcribes the 99 Arabic names from it, and the developer or a reviewer signs off on all 99 before release. Meanings stay null in v1. The Names are built last, after the edition is named.
2. **Hijri adjustment applies everywhere,** including the Hijri date in the Salah screen header. Only the date text changes on Salah. This is an explicit exception to ADR 0032 §2.
3. **Occasions: agreed dates only.** 1 Muharram, 10 Muharram, 1 Ramadan, 1 Shawwal, 9 and 10 Dhul Hijjah, and the white days (13–15). No 12 Rabiʿ I, 27 Rajab, 15 Shaʿban or fixed Laylat al-Qadr.
4. **Hijri occasion reminders:** yes, with 6 slots in the shared budget. Azkar goes from 21 to 15 slots. They're part of the reminders hub, and the user turns them on (or accepts them in the recommended set).
5. **Build order:** Hijri, then Moon, then Names. No feature switches (ADR 0042, features enabled by default).

## Decisions accepted, 3 Nov 2026

All 12 decisions accepted (developer, 3 Nov 2026). The recommendation from each item in «Decisions that need the developer» is the binding decision. The items below record the binding form; the 2 Nov answers above (1–5) are superseded by the fuller versions here.

1. **Which enumeration and what the screen says.** The Jāmiʿ al-Tirmidhī narration list. Every screen that shows the list carries its source name («القائمة: …») and an info button opening the source row. No sentence worded by Taybah says scholars differ; if a reviewed, permitted sentence on that point is approved later, it is added with its source.
2. **Where the 99 strings come from.** Hand transcription by the developer or a named reviewer from one printed edition of the narration. **No ISBN is invented now.** The edition title, publisher, year, hadith number and the transcriber's name are filled in at plan step N1 before any import; the field stays empty until then. AlAdhan (`https://api.aladhan.com/v1/asmaAlHusna`) is used as a diff-only cross-check and is never stored (ADR 0043 A2). This closes the conflict the content plan's "Primary for Asma al-Husna" row created.
3. **Meanings and English.** None in v1. The meaning field stays null; its section is not drawn. In its place the detail offers Quran references, each opening the reader and, from there, installed tafsir. The optional HadeethEnc records 10416 and 64673 («about the names») may be added as a sourced note under the same accepted-risk decision as ADR 0042-features-enabled-by-default §2; the developer confirms that acceptance before any note is imported.
4. **Delivery.** Pack group `names` through the existing manifest and pack builder, with the Azkar-style provenance rows and locks. The `content_sources` row starts `pending`; a second reviewed migration sets it `granted` only after the edition and reviewer are recorded (step N1).
5. **Learned marks.** Cut. Favourites and share only. The progress strip is not built in v1 (spec §1 hifz-progress cut).
6. **Hijri adjustment scope.** One stored adjustment (−2 to +2, MMKV `hijri.adjustDays`) applied by the shared `formatHijriDate`. The Salah date header changes when the adjustment is non-zero; this is the explicit exception to ADR 0032 §2 recorded in the 2 Nov decision above. The Home date pill (frames `HomeHijriDate`, `HomeHijriDateDark`) is approved.
7. **Occasions.** Fixed, uncontested dates only: 1 Muharram, 10 Muharram, 1 Ramadan, 1 Shawwal (Eid al-Fitr), 9 Dhul Hijjah (Day of Arafah), 10 Dhul Hijjah (Eid al-Adha), and the white days (13–15 of each month). Excluded: 12 Rabiʿ I, 27 Rajab, mid-Shaʿban, Laylat al-Qadr. Names are calendar labels; no virtue wording.
8. **Hijri reminders and the shared budget.** Yes: optional reminders for the six annual occasions (one pending notification per enabled occasion, off by default). `HIJRI_REMINDER_SLOTS = 6` in `budget.ts`; `AZKAR_SLOTS` falls from 21 to 15. Budget tests updated at plan step H5.
9. **Astronomy dependency.** `suncalc` 2.1.1 (BSD-2-Clause, 5 Oct 2026), subject to the M1 gate (refraction removal must reach ≤ 0.05° agreement with `astronomy-engine`). If M1 fails: `astronomy-engine` 2.1.19 with a documented exception to the 12-month rule, as ADR 0011 accepted for Amiri.
10. **Criterion and wording.** Odeh (2004, Experimental Astronomy 18) as the primary displayed criterion; Yallop (1997, NAO TN 69) q kept in an optional details line. Zone labels and the disclaimer sentence are reviewed Arabic copy; no wording is shipped until the reviewer approves them.
11. **Moon location and map.** Location is read-only from the Salah cache (`peekPrayerLocation` / `loadPrayerLocation`); no write, no permission prompt, no map. With no location the screen shows `MoonSightingNoLocation` and links the user to Salah. Visibility map is a cut line.
12. **Navigation and schedule.** Three Menu cards (frames `MenuNewCards*`), routes `/asmaa`, `/hijri`, `/moon`, no new tab. Sidebar entries on expanded windows are a cut line (not drawn). Build order: Hijri → Moon → Names (no feature switches, ADR 0042-features-enabled-by-default).

**Audio for Names: no play controls in v1.** Licensing is the same wall as F1. No TTS, no YouTube scraping. A follow-up is warranted when a licensed or commissioned recitation exists; at that point, hosting mirrors ADR 0040. Rules are recorded in ADR 0055.
