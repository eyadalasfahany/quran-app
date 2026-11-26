# Step 15 — The chosen riwayah's own text in Reading and Focus (ADR 0100, draft)

Status: **plan; waiting for the developer.** Written 26 Nov 2026 by the planner, after the developer's instruction: «words of each riwayah should also be shown on reading and focus modes, not only on quran». It is a separate step because it needs a new ADR (`docs/adr/0100-riwayah-text-in-reading-and-focus.md`, proposed), a licence reading, a font decision and a new content kind. Nothing here is implementable until the decisions below are made. Branch `main`; stage and commit nothing. Read `.claude/agent-rules.md` first. **Never print Quran text in a report: counts, keys, paths and codepoint numbers only.**

**Depends on:** step 9 (per-riwayah marks and place, the pack download for each riwayah), step 14 (al-Duri's numbering decision; the pinned quran-text files and their A1 check). Not on step 13.

## Rests on

- ADR 0090 «Decided» 5 (Reading and Focus show Tanzil Hafs for every riwayah: to be superseded), decision 3 (Amiri Quran only), decision 10 (non-Hafs labels), decision 12, «Decided» 1; ADR 0048 (font rejection and the EULA reading); ADR 0014 (no Quran translations); ADR 0015 (tafsir Arabic only); `docs/content-plan.md` rows 114–117 (KFGQPC font, quran-text, quran-svg); `apps/mobile/CLAUDE.md` «Quran rendering rules» (the Imla'i-text label).
- Spec §4, §6, §12 (edited with ADR 0100 when accepted).
- Findings and sources: ADR 0100 «Context» (all measured 26 Nov 2026 from the pinned quran-text files, the Complex's fonts and Amiri Quran 1.003 in `apps/mobile/assets/fonts/Amiri/AmiriQuran.ttf`).

## What I found (26 Nov 2026; everything below was measured, not assumed)

1. **A text source exists** for all four riwayat per word with page and line (quran-text, CC BY 4.0 over the Complex's text). It is already pinned and A1-checked. Details and a counts table are in ADR 0100 and step 14.
2. **Amiri Quran cannot render Warsh, Qalun or al-Duri.** 15,469 of 77,431 Warsh words, 13,508 of Qalun's and 1,806 of al-Duri's contain a codepoint it lacks (the Arabic Extended-B letters U+0870–0879 and U+0887, U+0888, U+08C9 for Warsh and Qalun; U+065E for al-Duri; plus U+06D1 and U+06D2). **It does render Shu'bah and Hafs** (0 missing); that is a coverage fact, and a render check (below) is still needed for correct mark placement. The task's example, «Warsh's fa with the dot below and qaf with one dot above», is a font feature: the text uses the plain U+0641 and U+0642, and only the Complex's Warsh and Qaloun fonts draw the Maghribi dotting.
3. **Scheherazade New 4.500 (OFL) covers every codepoint of every riwayah**, but has no Maghribi form.
4. **The Complex's four riwayah fonts** (`quran-text/data/fonts/UthmanicWarsh-v-3.0.ttf`, `UthmanicQaloun-v-3.0.ttf`, `UthmanicShubah-v-3.0.ttf`, `UthmanicDouri-V20.ttf`; 245, 255, 241 and 256 KB; fsType 0) cover their own text completely. Their EULA grants Use, Copy, Distribute free, and forbids Sell, Modify, Alter, Translate, Reverse Engineer, Decompile, Disassemble, Reproduce. Whether bundling or serving the unmodified file is allowed is a legal reading: ADR 0100 explains, and the developer decides (and can ask the Complex).
5. **Numbering:** Shu'bah = Hafs (same 6,236, same `ayah-map` rows); Warsh and Qalun 6,214; al-Duri unresolved (6,217 in the text, 6,218 in the artwork). 96.5% of Warsh and Qalun ayahs map `same` to a Kufi ayah; 215 do not (59 split, 155 merged, 2 shifted, plus the basmala).
6. **Not NFC:** 22,690 to 24,291 words per file change under NFC. The importer must never normalise.
7. **`rasm_imlai` is empty for the four**, so no Imla'i spelling exists for them (`known-issues.md` §10): the label rule in `apps/mobile/CLAUDE.md` («Imla'i text plus the ayah number») cannot be met for non-Hafs; the current approved difference (surah name and number) is the fallback.

## Decisions needed before any code (list; the planner decides none)

| # | Decision | Owner | Planner's default | Blocks |
| --- | --- | --- | --- | --- |
| D1 | **Font** for Warsh, Qalun, al-Duri: A the Complex's fonts, B Scheherazade New 4.500, C Shu'bah only | developer | A if the legal reading is yes; otherwise C, then B | the whole device part |
| D2 | **Orthography:** Mashriqi dotting acceptable for Warsh and Qalun (only if B)? | developer | no | D1 B |
| D3 | **Legal reading** of the Complex's EULA («Distribute» vs «Reproduce»), and whether to ask the Complex in writing | developer | ask | D1 A |
| D4 | **al-Duri numbering** (step 14 a, b, c) | developer | hold al-Duri | al-Duri only |
| D5 | **Text sign-off** against an authorised printed mushaf per riwayah (a sheet of random ayahs, zero errors) | developer | yes, as for the artwork | release |
| D6 | **Labels** for non-Hafs ayahs: own text plus number, or surah name plus number | developer | keep name plus number until VoiceOver is tested | a11y |
| D7 | **Place across riwayat** for merged, split, shifted ayahs | developer | first Kufi ayah of the range | place |
| D8 | **Search scope** | developer | the chosen riwayah only | search |
| D9 | **Tafsir** for non-Hafs: Hafs-only, or via the ayah map | developer | Hafs-only (Shu'bah gets it, same numbering) | tafsir |
| D10 | **Delivery of the font** (only if A or B): pack file loaded at runtime, or bundled (store build) | developer | pack file | release type |
| D11 | **ADR 0100 accepted**, and the `docs/content-plan.md` rows rewritten (quran-text «never stored», font rows) | developer | — | all |
| D12 | **Credit wording** for quran-text and the Complex in Sources | developer | as ADR 0100 decision 7 | release |

## Design the planner proposes (to review once D1–D3 are answered)

### API (`apps/api`)

- **Importer** `RiwayahTextImporter` (`app/Domains/Mushaf/`, reading the pinned quran-text CSV through the existing `QuranTextSource`, extended with a `text` accessor): one row per ayah, `(surah, ayah, text, text_search, page)` where `text` is the words joined by a single space (with the `resegmented` rule checked against the Complex's `*Data_v2` file first, ADR 0100 decision 2), stored in `utf8mb4_0900_bin`, never normalised, never trimmed. Ayah 0 (the Fatiha basmala of Warsh, Qalun and al-Duri) is kept as a row with `ayah = 0` so the basmala shows where the print shows it. `text_search` uses `ArabicNormalizer` plus a fold for the Extended-B letters (read quran-text's `docs/SEARCH-FOLD.md` for the published fold; do not invent one).
- Tables: `riwayah_verses (riwayah, surah, ayah, text, text_search, page)` and `riwayah_ayah_map (riwayah, surah, ayah, kufi_surah, kufi_ayah, kufi_last_ayah, relation)` from quran-text's `data/ayah-map.csv` (pinned, A1-checked: add its blob SHA and size to `quran-text-7bdefde.json`).
- **Integrity gate (non-negotiable 1):** a per-riwayah canonical SHA-256 over the ayahs in `(surah, ayah)` order; the approved value lives in config (`mushaf.approved_riwayah_text.{key}`), set by the developer after the print check; the importer fails if the computed digest differs. A test re-derives each ayah from the source words (join rule) and compares bytes. `packages/quran-text-check` gets a per-riwayah mode that takes the pack and the digest; **its Tanzil check and the 6,236-ayah checksum are not touched.** API CI runs the new check only when the pinned CSV is in the cache.
- **Pack:** a new resource group `riwayah_text` with one resource per riwayah (`riwayah_text:warsh`, …), built with the SVG packs' writer pattern (`SvgMushafPackWriter` as the model: its own SQLite file, served as is). Size estimate: about 1.3 MB raw per riwayah of ayah text; **measure** the gzipped pack. If D10 says «pack file», the pack also carries the font file **unmodified** (byte for byte, with its SHA-256 recorded in `meta`; no subsetting, no conversion).
- OpenAPI: any endpoint change runs `npm run generate -w @quran/api-contract`; packs use the existing manifest route, so none is expected.

### Device (`apps/mobile`)

- `core/riwayah-text/` (new): `RiwayahTextReader` (read-only SQLite, `verify()` checks schema, riwayah, the digest from `meta`), `useRiwayahText(key)` (installed record, download, status), and the auto-download rule: the chosen riwayah's text pack downloads on onboarding «متابعة» and every launch, before its pages (the small pack first; ADR 0090 amendment item 5 otherwise unchanged).
- A **reading text source** abstraction so Reading and Focus ask `useQuranVerses(riwayah)`; for `hafs` it is today's `content.db` code path **unchanged**, for the others `RiwayahTextReader`. No Hafs behaviour changes.
- Font: `quranFontFamily` becomes `quranFontFor(riwayah)`; today it is the constant `AmiriQuran` in `src/core/theme/fonts.ts` and `QuranText`/`quranText()` hard-code it (`apps/mobile/CLAUDE.md`). Per D1: A loads `KFGQPCWarsh`, `KFGQPCQaloun`, `KFGQPCDouri` from the installed pack file with `expo-font` at runtime (or from assets if D10 says bundle); the family is named after the file's own name table.
- **Reading and Focus** (`ReadingAyahRow`, `FocusStage`, `RecitedQuranText`, `FocusAyah`, `SurahHeader`, the ayah end mark): numbering and surah ayah counts from the riwayah's own pack; the surah header's ayah count, the Fatiha basmala row (ayah 0), the page and juz labels from the pack (page from quran-text; juz is Hafs-only unless the pack has it: **hide a label that has no source**, ADR 0031's rule).
- **Search:** `text_search` of the chosen riwayah (D8). Results open the chosen riwayah's place.
- **Marks and place:** per-riwayah tables from step 9 (`riwayah_bookmarks` and the highlight and note tables there) in Reading and Focus too; the place across riwayat through `riwayah_ayah_map` (D7).
- **Accessibility:** per D6.
- **Unavailable states** (honest, no invented content): audio controls and word follow on non-Hafs text; tafsir on non-Hafs text (D9); each is a short note, never a silent no-op.
- **The `ReadingOtherRiwayah` and `FocusOtherRiwayah` frames are withdrawn** and the «names Hafs» pill and its i18n keys removed.

### Frames (ADR 0087; draw in `screens/frames/reading/` and review at `design/reading/<Screen>/index.html`; placeholders, no real Quran text; captions carry «(بانتظار الموافقة)» unless the developer pre-approves)

`ReadingRiwayah` (a non-Hafs reading page with its font, the unnumbered basmala row), `FocusRiwayah`, `ReadingRiwayahAudioUnavailable` (the play control state), `TafsirRiwayahUnavailable` (if D9 keeps Hafs-only), the reader settings sheet with the riwayah's text pack download state, and the **onboarding** step note that the text downloads first. Frames for the font are drawn with the real font only in the throwaway check below, never in `screens/`.

## The render check (a release blocker; like ADR 0048's)

Per riwayah and per candidate font, written as a throwaway script in the scratchpad (not committed; not Quran text in any repo file), run **before** D1 is final:

1. **Coverage and shaping:** every distinct word shaped with HarfBuzz (`uharfbuzz`): count words with `.notdef` (glyph 0) and with the dotted circle glyph (U+25CC) as a fallback. The planner's `.notdef` run is in ADR 0100; **add the dotted-circle count**, which was not run.
2. **Marks:** for 200 random ayahs per riwayah plus the ayahs with the rarest codepoints (each of U+0870–0879, U+0887, U+0888, U+08C9, U+065E, U+200D, U+200F and U+08CC where it occurs), render in Chrome and **on the iPhone 17 Pro simulator** (iOS shapes with CoreText, Android with HarfBuzz; ADR 0048 made the simulator the iOS gate) and compare by eye against the printed page artwork of the same ayah (the quran-svg page of that riwayah): letter shapes, mark positions and stacking, the dagger alef, open tanwin, the small waw and yeh, the sajdah line, and the dotting of fa and qaf in Warsh and Qalun. The developer signs a sheet of these crops (zero errors) for each riwayah.
3. **Justification and line metrics:** Reading uses unjustified lines; check kashida behaviour of any font used (ADR 0048 decision 11 found Scheherazade New drawing kashida inside a divine name on iOS under `textAlign: 'justify'`).
4. **Result:** a table riwayah × font with pass or fail and the evidence; written into ADR 0100 before it is accepted.

## Steps (after the decisions)

1. **15.0** Decisions D1–D12, ADR 0100 accepted, content-plan and spec edits made by the coordinator; frames drawn and reviewed.
2. **15.1 API:** importer, tables, pack, integrity gate, tests (below). Gate: `composer qa`; digests per riwayah; the developer's print sign-off sets the approved digests.
3. **15.2 Device core:** reader, hook, font loading, the text-source abstraction, tests. Gate: `npm run lint && npx tsc --noEmit && npm test -- --maxWorkers=2 && npx expo-doctor`.
4. **15.3 Reading and Focus UI,** search, labels.
5. **15.4 Marks, place and the unavailable states.**
6. **15.5 Measure and sign-off:** the render check on the simulator; Arabic and English, compact and expanded; the integrity check on the installed pack; the developer's text sign-off sheet.

## Tests (sketch; written with each step)

- API: importer joins words exactly (the `resegmented` rule), never trims or normalises (a fixture word with a mark order that NFC would change round-trips byte for byte); ayah 0 row; the digest gate fails on a changed byte; the ayah map rows; pack verify; the Tanzil check untouched.
- Mobile: `RiwayahTextReader` (verify refuses a wrong riwayah, digest or schema); `useQuranVerses` returns the old path for Hafs; `ReadingAyahRow` and `FocusStage` render a non-Hafs fixture ayah with its font family and the ayah's own number (RTL and LTR); the unnumbered basmala row; search over a riwayah fixture; a mark written in Warsh Reading is the same record the Mushaf page shows; the unavailable states; the label rule per D6.
- Fixtures use marked placeholders, never Quran text (`FIXTURE text 1 — not a dhikr` style).

## Release blockers

- **RB-1** Font licence reading (D3) or the alternative chosen.
- **RB-2** The developer's text sign-off per riwayah (D5) and each riwayah's integrity digest.
- **RB-3** al-Duri's numbering (D4).
- **RB-4** The render check on the simulator, signed by the developer.
- **RB-5** ADR 0100 accepted and the content-plan rows rewritten (the quran-text «never stored» sentence).
- **RB-6** The credit (D12).
- **RB-7** If a font is bundled (D10), a store build; otherwise an EAS Update (`npx eas-cli fingerprint:compare`).

## Risks

- A text source marked «Beta», whose v3.0 documents have no recorded origin; the sign-off is the control.
- A second or fourth font reverses two earlier decisions (ADR 0090 decision 3, ADR 0048); the licence reading is the weakest link.
- The Extended-B letters are Unicode 14 (2021): older Android versions may lack system fallback, which is another reason not to rely on one; the pack-delivered font avoids it.
- VoiceOver and TalkBack reading of the Complex's encoding is untested.
- Search over a folded text for letters that look alike may surprise readers; a per-riwayah test set is needed.

## Report back

The decisions taken, the render table, the pack sizes and digests, what the integrity check proved, screenshots, and what did not match this plan.
