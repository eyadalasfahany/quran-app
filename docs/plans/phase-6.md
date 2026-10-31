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
| D3 | Repetition | `required_count` nullable; counter when sourced, «تم» otherwise; never assume 1 |
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
| 10 | Exit check | Checks, visual review, airplane mode, both languages, both window classes | |

## Variations (reviewer decision, 31 Oct 2026)

Upstream variations are mutually exclusive alternatives (e.g. setting out / returning, food / milk, primary / alternative wording), never steps in sequence.
- A category link to a specific variation (ch. 27 `morning` / `evening`) shows exactly that variation.
- A `'*'` link shows **one** variation at a time, by default the first in upstream order, with a switch labelled neutrally «الصيغة ١ / ٢» ("Wording 1 / 2"). Upstream variation labels are English editorial text; they are not stored, and they are not translated.
- The user's choice persists per entry (MMKV). Progress keys include the variation, and the entry counts once in category totals.

## Progress periods (UX policy, not a ruling)

Progress resets are a convenience. They never claim when a dhikr is due.

| Category | Period | Key |
| --- | --- | --- |
| الصباح، المساء، الاستيقاظ | Local calendar day | `YYYY-MM-DD` |
| النوم | Night (resets at 12:00 local) | date of the evening |
| بعد الصلاة | Most recent prayer from the Salah engine, or the local day without a location | `YYYY-MM-DD:<prayer>` |
| Browse categories and single entries | Session: kept until the user resets or completes | `session` |
