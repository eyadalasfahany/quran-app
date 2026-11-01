# Phase 6 — الأذكار (Azkar)

Spec §15 · ADR 0031 (sources, rights, provenance, data ownership) · research: `phase-6/source-research.md`.

**Exit criterion:**
- With a licensed Azkar pack installed, the الأذكار home lists session categories (الصباح، المساء، بعد الصلاة، النوم، الاستيقاظ) and browse categories.
- The reader shows each item's Arabic text, with Quran passages rendered from `content.db.verses`.
- The reader counts sourced repetitions, or offers «تم» where no count is sourced.
- Progress, favourites and reminders persist offline in `user.db`.
- Sourced sections (instruction, context, explanation, virtue, reference, grade) show only when sourced.
- Audio controls appear only for licensed recordings.
- Category reminders fire at a user-chosen clock time or prayer-relative offset, with no network.
- Visual conformance against the Azkar frames, in Arabic and English, compact and expanded.
- **Release gate:** no production content ships until the ADR 0031 release blockers are cleared.

**Design sources:** new frames in `quran-app-screens.html` (step 4), drawn from existing tokens and approved by the developer before UI review sign-off (ADR 0010).

**Rules:**
- All rules from previous phases (`apps/mobile/CLAUDE.md`, `apple-design`, tokens through `useTheme()`, one component per file with its colocated test).
- Never generate religious content. A field with no verified source is `null`, and its UI section is omitted.
- Quran text inside azkar comes only from Taybah's Quran tables (ADR 0031 §4, ADR 0014).
- Production OpenDua import stays disabled (two locks, ADR 0031 §1) until written rights arrive.
- Development uses marked placeholder fixtures only.

## Decisions (developer, 31 Oct 2026 — recorded in ADR 0031)

| # | Question | Decision |
| :--- | :--- | :--- |
| D1 | Canonical source | OpenDua Hisn al-Muslim, pinned version + SHA-256; production import blocked until written rights |
| D2 | Arabic chapter titles | Named, permitted Arabic source only; field nullable, pending |
| D3 | Repetition | `required_count` nullable; counter when sourced (a count of 1 included), single ring «تم» otherwise; never assume 1 (amended 1 Nov 2026, see below) |
| D4 | Quran passages | Reviewed verse-reference map; rendered from `content.db.verses`; no translation (ADR 0014) |
| D5 | English / transliteration | Non-Quranic duas only, when the licence covers them, with attribution |
| D6 | Audio | No OpenDua audio until written rights; rights fields on every recording; no controls without legal audio |
| D7 | Timing | Semantic occasion and timing type only; no morning/evening boundary; reminders are user preferences |
| D8 | Missing notes | Nullable, individually sourced; section hidden when empty |
| D9 | Dorar | Backend-only adapter behind an interface; token in API env; no bulk import, no offline storage |
| D10 | Phase | New Phase 6 after Salah & Qibla; Beta becomes Phase 7 |

## Steps

| # | Step | Description | Status |
| :---: | :--- | :--- | :---: |
| 1 | Docs, ADR, spec | ADR 0031, spec §4/§6/§7/§12/§13/§15, content plan, this plan, phase pointers | done |
| 2 | Schema & pack contract | MySQL + `content.db` Azkar tables, `azkar` pack group in the shared contract, `user.db` tables, rights gate | |
| 3 | Ingestion pipeline | OpenDua parser, validator, Quran-reference splitter, import report, `azkar:import` command (locked) | |
| 4 | Design frames | Azkar frames in `quran-app-screens.html`, all states, light/dark, compact/expanded | |
| 5 | Mobile data layer | Repositories, hooks, progress periods, favourites, search, share text, relevant-now, dev fixtures | |
| 6 | Mobile UI | Components, screens, routes, Home tile, Salah row, i18n | |
| 7 | Reminders | Category and entry reminders (clock and prayer-relative) on the shared notification layer | |
| 8 | Audio rights & states | Rights model, availability logic, UI states; OpenDua not connected | |
| 9 | Dorar adapter | `HadithReferenceSource` interface, Dorar transport behind env, null and fake sources, tests | |
| 11 | القائمة tab (ADR 0032) | Menu tab replaces only the الصلاة tab item; menu screen per the approved `Menu` frames; Salah unchanged. Cursor prompt `phase-6/cursor/03-menu-tab.md` | |
| 10 | Exit check | Checks, visual review, airplane mode, both languages, both window classes | |

## Follow-up: generalise the download manager (after the first licensed recording)

Step 8 added `AzkarDownloadPort` and `NoAudioDownloadPort` (`apps/mobile/src/features/azkar/audio/downloads.ts`) and did not build a second download manager. `features/audio/downloads/manager.ts` is keyed by Quran `audio_file_id`. Generalising it (an additive `user.db` change: an owner `kind` and a generic key) waits until the first licensed Azkar recording exists, so it can be tested end to end without risking Quran downloads. The port then needs a change signal so the hooks re-read live.

## Variations (reviewer decision, 31 Oct 2026)

Upstream variations are mutually exclusive alternatives (e.g. setting out / returning, food / milk, primary / alternative wording), never steps in sequence.
- A category link to a specific variation (ch. 27 `morning` / `evening`) shows exactly that variation.
- A `'*'` link shows **one** variation at a time, by default the first in upstream order, with a switch labelled neutrally «الصيغة ١ / ٢» ("Wording 1 / 2"). Upstream variation labels are English editorial text; they are not stored, and they are not translated.
- The user's choice persists per entry (MMKV). Progress keys include the variation, and the entry counts once in category totals.

## Tap anywhere to count (developer, 1 Nov 2026)

Approved difference from the `AzkarReader` frame: in the reader, a tap anywhere on the screen counts one repetition (widened from the dhikr area to the whole screen, developer, 1 Nov 2026) (or marks «تم» when no count is sourced), not only a tap on the 120 pt counter.
- The circle stays as the visible progress and the accessible control. The tap surface is hidden from VoiceOver and TalkBack, so screen-reader users keep a single counter button.
- Buttons (close, share, favourite, text size, details, previous/next, variation switch, the counter, «تم», «إتمام») keep their own taps and never also count, so a press on the counter counts once. The completion screen and a completed unit ignore taps. The details panel beside the reader on an expanded window is not part of the surface. Scrolling a long dhikr never counts.
- The same 120 ms double-tap guard, haptics, completion and Reduce Motion rules apply.

## Auto-advance and mark complete (developer, 1 Nov 2026)

Approved behaviour for the reader:
- **Auto-advance:** when a unit completes (its sourced count is reached, or «تم» is tapped), the reader moves to the next unit after a short pause, so the success haptic and the full ring are seen. Reduce Motion moves without animation. Previous and next still work by hand, and a completed unit can be revisited.
- **Last unit:** when every unit in the session is done, the reader does not jump away. It shows a «إتمام» / "Mark as complete" button, and tapping it records the session as complete for its period, then shows the completion screen («أتممت أذكار …», «البدء من جديد», «العودة»).
- Session completion is stored in `user.db.azkar_progress` under a reserved unit key `__session__` for the scope and period. No migration is needed. «البدء من جديد» clears it with the rest of the scope.

## Counter for a count of one and for no sourced count (developer, 1 Nov 2026)

Amends ADR 0031 §6 and §12 (last bullet). The reader has one control for every unit, the 120 pt ring (`AzkarCounter`):
- **A sourced count of 1:** the same counter as any count, reading «٠ من ١», then «١ من ١» with a full ring. One tap completes it. The value keeps the counter's «من» format from the approved `AzkarReader` frame; the developer's «٠ / ١» example was not used, so every counter reads the same way. Confirm if «/» is wanted.
- **No sourced count (null):** the single variant. An empty ring with a check and «تم» / "Done" in its centre, and no number. One tap fills the ring and completes the unit. Accessible role and label as the counter: a button labelled «وضع علامة «تم»» / "Mark as done".
- The bottom «تم» pill is removed. The previous and next arrows stay.
- Completion is one path for every unit. Auto-advance goes to the next unit not yet done, else the first open one, else the last unit, where «إتمام» shows once every unit is done. Before, it went to the next index even when that unit was already done. Then the reader sat on a finished unit with a dead tap surface and no «إتمام», so a session looked unfinished. That was the root cause of the reported non-completion.
- **Opening at an entry:** a category list card opens the reader at its unit with `?unit=` (already in place); the reader honours it while no move has been made. Other lists open the entry's first unit.
- **Motion:** the dhikr content slides and fades on a unit change (forward enters from the reading-start side, as a pushed screen does); each count bumps the ring with a spring, and completion pulses it; the completion screen scales in; category rows fade in with a stagger when they mount. Reduce Motion: fades only, and nothing scales.

## Count from the secondary source (developer, 1 Nov 2026)

Amends ADR 0031 §6 (the dated note there is the decision of record). The primary (OpenDua) has `times` for only a few items. The import fills a missing `required_count` from hisnmuslim's `REPEAT` for the same book number, and records `required_count_source` (server-side only, not in the pack schema).
- Pairing is by book number, and by position only when both sides have the same number of recitations. Otherwise the item stays `null` and is reported as ambiguous.
- A primary count is never replaced. A difference is a warning, and the primary's count is kept.
- The secondary is used only while its own lock is open. In production, while it is locked, nothing is filled.
- Local result (1 Nov 2026): 36 counts from OpenDua, 179 filled from hisnmuslim, 5 conflicts kept at OpenDua's count, 41 ambiguous items left `null`. Entry `hisn-al-muslim:entry-000084` now reads 1.

## Progress periods (UX policy, not a ruling)

Progress resets are a convenience. They never claim when a dhikr is due.

| Category | Period | Key |
| --- | --- | --- |
| الصباح، المساء، الاستيقاظ | Local calendar day | `YYYY-MM-DD` |
| النوم | Night (resets at 12:00 local) | date of the evening |
| بعد الصلاة | Most recent prayer from the Salah engine, or the local day without a location | `YYYY-MM-DD:<prayer>` |
| Browse categories and single entries | Session: kept until the user resets or completes | `session` |
