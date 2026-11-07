# 0076 — Hadith chapters (باب) from OpenITI, titles and number ranges only

Date: 2026-11-07 · Status: **Proposed** (the developer decided on 7 Nov 2026 «use OpenITI»; this ADR records how, and is not Accepted until the developer accepts the defaults below) · Amends ADR 0042 (§2 and §4a: «`hadith_chapters` is empty for fawazahmed0»; the title sources), plan `docs/plans/phase-7.md` D8 and D9, `docs/plans/phase-7/README.md` (rule «fawazahmed0 has no chapter level»). Does not amend D3, D4, D6 or D7. Research: `docs/plans/phase-7/chapters-research.md`. Plan: `docs/plans/phase-7.md` D14, step 6b.

Numbering note: 0076 is free (the last ADR is 0075; `git log --all` shows no 0076 file). The folder already has duplicate numbers (0042, 0043, 0044 each appear twice); this ADR does not touch them.

## Context

fawazahmed0/hadith-api has no باب level, so Phase 7 ships books that list their hadith directly (ADR 0042 §2, plan D8). The research (`chapters-research.md`, 7 Nov 2026) looked for a free source of chapter titles and found one usable candidate: the OpenITI corpus. It has real باب headings, its hadith numbers are the same scheme as fawazahmed0's `hadithnumber` (checked by comparing text for the same number), and it has folders for the seven multi-book collections. The other candidates are book-level only (hadith-json, hadithapi.com, meeAtif), renumbered and unlicensed (LK Hadith Corpus), or sunnah.com copies (RB13 class).

Numbers from the research (measured on **GitHub commits** from 2025, not on the Zenodo release): the share of OpenITI chapters whose numbers all exist in fawazahmed0 and fall in one book is Bukhari 92.2%, Abu Dawud 98.1%, Nasa'i 94.1%, Ibn Majah 99.9%. Requiring every hadith of the chapter to also pass the same-number text check gives about 78.6%, 78.7%, 92.1% and 99.4%; that figure is a lower bound because inline commentary in the Shamela text lowers it. Muslim and Tirmidhi use different markup and returned 0 numbered hadith with the heuristic parser. Malik was not measured.

Facts about the schema that this ADR relies on (read in `apps/api/database/migrations/2026_11_01_120003_create_hadith_chapters_table.php` and `..._120004_create_hadith_entries_table.php`):
- `hadith_chapters.book_id` is one book, so a chapter that crosses a fawazahmed0 book cannot be stored.
- `source_chapter_key` is `varchar(32)`; `source_key` is `varchar(96)`. A version id plus an ordinal does not fit the first (the Nasa'i version id alone is 31 characters).
- Every chapter row carries its own `source_id`. A chapter row can therefore point to a source other than the one that supplied the hadith rows.
- `hadith_entries.chapter_id` is nullable.

## Decision (proposed)

### 1. Source and pin
1. **OpenITI** is the source of chapter titles and of the hadith-number ranges each chapter covers. **Nothing else is taken from it**: no hadith text, no grades, no isnad or commentary.
2. **Pinned to the Zenodo release 2023.1.8** (17 Oct 2023), DOI `10.5281/zenodo.10007820` as recorded in the research. Why Zenodo and not a GitHub commit: the licence (CC BY-NC-SA 4.0) is stated only on the Zenodo record, the GitHub repos have no LICENSE file, and a Zenodo release is a frozen archive that cannot move. The matcher records the SHA-256 of every OpenITI file it reads.
3. **Open items to verify in step 6b.0 (cannot be confirmed from the docs):** (a) whether `10.5281/zenodo.10007820` is the version record or the concept record (cite the **version** DOI); (b) whether the version ids measured on GitHub (the research names `Shamela0001681-ara1` for Bukhari, `Shamela0001726-ara1` for Abu Dawud, `SunanSughra.Shamela0000829-ara1` for Nasa'i and `Shamela0001198-ara1` for Ibn Majah) exist unchanged in 2023.1.8; (c) the archive size and layout. **Every figure in the research is void for acceptance purposes until the matcher re-measures it on the Zenodo files.** If the Zenodo files do not carry a usable version, the fallback is a GitHub commit SHA with the licence cited from Zenodo; that is a developer decision, not a default.

### 2. What is stored, and where it lives
1. Each accepted chapter is a `hadith_chapters` row: `chapter_number` = ordinal in the book (1-based, OpenITI order), `position` = the same, `title_ar` = the cleaned title (section 3), `title_en` = null, `hadith_count` derived by the importer, `source_id` = the `openiti` row, `source_chapter_key` = the short ordinal in the OpenITI version (at most 32 characters), `source_key` = `openiti:{slug}:{book_number}:{ordinal}` (at most 96). The version id and release are kept in the data-file header and in `content_sources.notes`, not in a row key.
2. Each hadith in an accepted chapter gets `hadith_entries.chapter_id`. The assignment is by the chapter's first and last hadith number in fawazahmed0's own position order inside the book. Hadith text, `source_id` and `source_key` of the hadith rows stay fawazahmed0's.
3. **No schema change.** The mixed provenance (hadith rows from fawazahmed0, chapter rows from OpenITI) works because each row has its own `source_id`. This is also why the step 18 claim «no schema, endpoint, pack or screen change» holds: the Sunnah.com re-import replaces the collection's rows, chapters included, in one transaction.
4. **Data file, not runtime import, not `config/`.** The matcher (section 5) writes a proposal; the developer reviews it and commits it as `apps/api/database/data/hadith/chapters/{slug}.json`. It is read only by the importer. It is not in `config/` because `config:cache` loads every config array on every request and Bukhari alone has about 3.7k chapters. `config/hadith.php` pins the SHA-256 of each committed chapter file (like step 5's per-file pins) and, separately, the SHA-256 of each OpenITI source file the matcher read. The importer refuses a chapter file whose hash differs. Production never downloads OpenITI.
5. **Data-file contents:** a header (`source: openiti`, release, DOI, version id, source-file SHA-256, matcher version, licence line) and, per chapter: ordinal, fawazahmed0 book number, first and last hadith number (strings), cleaned title. **No hadith text and no match statistics** in the file (statistics go to the report).
6. A licence notice sits beside the data file (`apps/api/database/data/hadith/chapters/LICENSE-NOTICE.md`): CC BY-NC-SA 4.0, source, release and the list of changes.
7. A collection with no chapter file imports exactly as today (no chapter rows, `chapter_id` null). Adding a collection's file later is a data change plus a pack version bump; no app release.

### 3. Titles: byte-exact except a closed, tested list
ADR 0042 §4a says titles are stored as received. OpenITI mARkdown headings carry markup, so «as received» needs a definition. **Proposal (developer decision): the title is the heading text with only these removals, and every other byte unchanged (diacritics, punctuation, bidirectional marks, internal spaces):**
1. the heading marker at the start of the line (the `###` level marker and the `|` or `$` prefix);
2. editor page and line markers (the forms `PageV…` and `ms…` that the research script strips; the exact patterns are confirmed in step 6b.0);
3. a line break inside a multi-line heading, replaced by one ASCII space;
4. ASCII whitespace at both ends.

Anything the list does not cover is **left in** and counted in the report; a title containing a character class outside the list is reported, not silently cleaned. The word باب at the start of a heading is kept as printed. The cleaning function is tested with placeholder strings only.

### 4. Quran text inside titles: no default (blocks Bukhari)
The research notes that many headings in the Shamela text are verse citations, and a chapter title may itself quote an ayah. Non-negotiable 1 and the agent rules say Quran text comes only from `content.db` verses and is never altered. A chapter title that carries an ayah in Shamela's spelling would show Quran text that did not come from Tanzil. **This is a religious-interpretation and policy decision for the developer. The ADR sets no default.** What 6b.1 must provide so the developer can decide: a detector (dev-only) that flags titles containing a run of words found in the Tanzil text the repo already holds, with counts per collection (no title is printed in the report); and a count of titles that take continuation lines. Options for the developer: reject those chapters; keep the title with the ayah part cut (an alteration, needs the developer's rule); keep as printed. **Release blocker RB18.** Until decided, no Bukhari file is committed; collections with zero detected hits are unaffected.

### 5. Matcher and acceptance rule per chapter
`hadith:match-chapters` (dev only; refuses `APP_ENV=production`; not scheduled; not in `release.sh`; never writes `config/` or `database/data/`; writes a proposal and a report under `storage/app/hadith/proposals/chapters/`). It reads the OpenITI files (local, SHA-256 checked against the pins) and the step 5 fawazahmed0 snapshot. **It may read OpenITI text and fawazahmed0 text in memory to check that numbers align; it stores neither** (section 7, question 1).

A chapter is accepted only if all of these hold. «Like the book titles» (ADR 0042 §4a) means a two-way 95% rule; with the research's two measured axes it reads:
- **Structural, hard (not a percentage): one book.** Every number the chapter lists exists with text in fawazahmed0 and all fall in one fawazahmed0 book, because `book_id` is single. Research column: «Within one fawazahmed0 book» (92.2 / 98.1 / 94.1 / 99.9%). A chapter that crosses a book boundary is rejected at any percentage. The parser must treat كتاب and أبواب headings as chapter terminators; the research found 0 recognised in Bukhari, which accounts for most of its 8% failures.
- **Forward, 95%: the numbers are the same hadith.** At least ceil(0.95 × n) of the chapter's n listed hadith pass the same-number text check (word-set Jaccard ≥ 0.5, the research's check, false-hit rate 0.024%). Research column: «Every hadith passes text check», measured there at 100% (80.1 / 78.7 / 92.2 / 99.5%); the 95% version is not measured and is at least as high.
- **Backward, 95%: nothing is missing in the range.** At least ceil(0.95 × m) of the m fawazahmed0 hadith (with text) between the chapter's first and last number, in fawazahmed0 position order, are listed by the chapter. Not measured in the research; the matcher measures it. It guards against OpenITI skipping numbers inside a chapter.
- **Small chapters.** ceil(0.95 × n) equals n for every n up to 19, so a chapter of 1 to 19 hadith must pass completely. That is intended, and there is no extra minimum beyond n ≥ 1. The report lists how many accepted and rejected chapters have n ≤ 19, so the developer sees the cost. Headings with no numbered hadith under them are not chapters.
- A rejected chapter is simply left out. The per-hadith text-check rate for a collection is reported; the research measured 88.1% for Bukhari and 90.9% for Abu Dawud. A collection whose rate is far below those is not committed until the developer has read the report.

### 6. Scope and order
First: **Bukhari, Abu Dawud, Nasa'i, Ibn Majah** (the four the research could parse). Bukhari waits on RB18. Then **Muslim, Tirmidhi and Malik**, each only once its per-version parser has been written and measured with the same report (steps 6c). `nawawi40`, `qudsi40` and `shahwaliullah40` have one section and no باب level and are out of scope.

### 7. Partly chaptered books (navigation decision, developer)
Some chapters will be rejected, so a book can have chapters for only part of its hadith. Options weighed:
- **A. A trailing group of the unchaptered hadith.** Moves hadith out of `position` order, while the reader's previous/next follows `position`. Rejected as the default.
- **B. In-place runs.** The app computes, from `chapter_id` null, contiguous runs between accepted chapters and shows them in order as rows labelled by number range. Nothing invented is stored. Needs a new row component, a repository query, i18n and a new frame.
- **C. Book-level all-or-nothing.** The importer writes a book's chapters only when every hadith with text in that book is covered by accepted chapters. Every book is then either fully chaptered or flat (today's `HadithCollBook` state). No new frame beyond caption changes, no navigation change, nothing new in the reader.

**Expected yield of C is low, and this is stated so it is not hidden.** C needs every hadith with text in a book covered by an accepted chapter. From the research: about 3% of Bukhari's hadith sit under no باب heading (7,349 of 7,580 covered); hadith before a book's first باب fail coverage by construction; and the per-hadith text-pass rate is 88% (Bukhari) and 91% (Abu Dawud) across roughly 38 chapters per Bukhari book, so most books will contain at least one failing chapter. C probably chapters Ibn Majah (99.9% of chapters pass) and few books elsewhere until the parser is fixed (كتاب boundaries) and the matcher is measured on the Zenodo files.

**Recommendation (conditional):** C if the 6b.1 per-book report shows that most books of a collection are complete; otherwise B. C needs no new UI and B can be added later without a schema change (the matcher takes `--partial-books=drop|keep`; the `keep` output already contains the accepted chapters of partial books). The report gives per-book coverage under both options, so the developer sees the real cost before choosing. Until the report exists, nothing is chosen. The saved-item rules are untouched: a saved hadith stores slug + number, never a chapter key.

### 8. Licence, attribution and ShareAlike
1. Licence: **CC BY-NC-SA 4.0**. NC is acceptable because the app earns no money (developer memory «App earns no money»); ND would not be. If that ever changes, this source must go.
2. **A migration adds `content_sources` row `openiti`:** `name` «OpenITI (Open Islamicate Texts Initiative)», `licence_url` the CC BY-NC-SA 4.0 deed, `notes` with the DOI, release, version ids, the changes made, the Shamela origin and the ShareAlike line, `permission_status` **`granted`** (the licence is the grant; `not_required` is what the Unlicense row uses; provenance only, ADR 0042 amendment of 2 Nov 2026 – developer may choose `not_required`). New migration; the step 2 migrations are not edited.
3. **Attribution.** The Sources & thanks screen is generated from `content_sources` (content plan, «Rules for every provider»), so the row produces the credit. Default wording (developer to accept or change):
   - Arabic: «عناوين الأبواب: OpenITI (مبادرة النصوص الإسلامية المفتوحة)، الإصدار 2023.1.8، الترخيص CC BY-NC-SA 4.0. أُجريت تعديلات: حُذفت رموز التنسيق من العناوين وربطت الأبواب بترقيم أحاديث fawazahmed0/hadith-api. لا يؤخذ من OpenITI نص حديث.»
   - English: «Chapter titles: OpenITI (Open Islamicate Texts Initiative), release 2023.1.8, CC BY-NC-SA 4.0. Changes were made: formatting markers removed from titles; chapters mapped to the hadith numbering of fawazahmed0/hadith-api. No hadith text is taken from OpenITI.»
   - Whether to add «عن المكتبة الشاملة» / «derived from al-Maktaba al-Shamila» is a developer question (section 9). The default above names OpenITI only.
4. **ShareAlike.** The chapter table is adapted material, so **it is licensed CC BY-NC-SA 4.0**: the committed data file (with the notice beside it) and the `hadith_chapters` rows in the packs. The rest of the pack (hadith text from fawazahmed0, the app, the API) is not adapted from OpenITI and is not relicensed. Risk for the developer: the chapter rows travel in the same SQLite pack as the hadith text, and whether that makes the pack one «adapted work» is a legal question this ADR does not answer; mitigation is that chapter rows stay separate, identifiable by `source_id`, and are described as CC BY-NC-SA in the Sources row. The developer accepts this or asks for a legal read.
5. Credit is shown on the Sources screens only (the Sources frames, see the plan). No per-screen line is added elsewhere. The credit links to the licence: the Sources row uses `licence_url` (the CC deed) as a link, not only the licence name as text (CC BY asks for a link where practicable).

### 9. Shamela upstream
OpenITI's Shamela-derived versions carry no clear licence from al-Maktaba al-Shamila. This is the same kind of upstream risk as RB13 (fawazahmed0 also lists Shamela in `References.md`) and is recorded beside it as **RB21**. It is smaller than RB13 in one respect: only short titles and number ranges are used, and the classical divisions are centuries old; edition numbering and editorial headings in some collections come from modern editors. The developer accepts it as RB13 was accepted, or does not.

### 10. Replacement by Sunnah.com (step 18)
`SunnahComSource` supplies chapters of its own (`chapterId` as float text in `source_chapter_key`). The wet run replaces each collection's rows, chapter rows included; the `openiti` source row stays as provenance history. The OpenITI data files are retired, with their pins. Saved items never store chapter keys, so nothing breaks. No schema change.

## Open decisions and recommended defaults (developer)

| # | Question | Recommended default |
| --- | --- | --- |
| 1 | May the dev-only matcher read OpenITI and fawazahmed0 text to check that numbers align? | **Yes.** In memory only; it stores no text, prints none, and the proposal file has no text field (a test asserts a fixed key whitelist). |
| 2 | Partly chaptered books | **C, book-level all-or-nothing**; B later if the report shows C leaves too many books flat. Navigation decision. |
| 3 | Attribution wording | Section 8.3, naming OpenITI only; Shamela naming is a separate yes/no. |
| 4 | Committed data file or runtime import | **Committed file** `database/data/hadith/chapters/{slug}.json`, SHA-256 pinned in `config/hadith.php`; no OpenITI download in production. |
| 5 | Pin | Zenodo release 2023.1.8 (version DOI to be confirmed), per-file SHA-256s. |
| 6 | Title cleaning list | Section 3. |
| 7 | Quran text inside titles | **No default.** Blocks Bukhari (RB18). |
| 8 | `content_sources.permission_status` | `granted`. |
| 9 | English UI | Shows the Arabic chapter title (no `title_en` exists), with English labels around it. |
| 10 | Name Shamela in the credit | No (default); developer decides. |
| 11 | SA scope | Section 8.4; accept the pack-mixing risk or ask for a legal read. |
| 12 | Title authorship per collection (research open decision 6): some headings are the compiler's own, others come from later editors, and this is a claim to verify, not a fact | The credit makes **no authorship claim** and names only source, release and licence; any per-collection authorship wording waits for verification. |
| 13 | Does the first Hadith release wait for 6b? | **No.** Chapters are separate data files. Without them every collection ships flat as planned (D8). Shipping chapters later costs one pack re-download per chaptered collection (version bump). The developer may instead hold the release for 6b. |

## Conflicts to list, not resolve
1. ADR 0042 §2, plan D8, `phase-7/README.md` rule «fawazahmed0 has no chapter level», spec §5 (line «Empty for fawazahmed0»), spec §6 pack row, spec §9 (`chapters` returns an empty list) and the caption «shown when the source has chapters (Sunnah.com)» on six frames all say chapters are empty or Sunnah.com-only. This ADR amends all of them once Accepted; proposed spec text is in `docs/plans/phase-7/spec-changes.md`.
2. ADR 0042 §4a and plan «Titles data» say titles come only from three listed places, and README says «Titles only from the other sources: hadithapi.com…». OpenITI is a fourth source for chapter titles.
3. ADR 0042 §4a «titles stored byte for byte as received» against section 3's closed list.
4. Non-negotiable 1 / agent rules (Quran text only from `content.db`) against ayat quoted in titles (section 4).
5. Plan and ADR 0042 cite «ADR 0045» for «no kill switch». The file `docs/adr/0045-english-surah-names.md` is about something else; the matching text is in `docs/adr/0042-features-enabled-by-default.md`. Pre-existing duplicate numbering; not fixed here.
6. Research measured GitHub commits; the licence and the pin are Zenodo (section 1.3).

## Consequences
- Release blockers RB17 to RB23 (plan) block **shipping chapter files only**; without them every collection ships flat and the Phase 7 release is not held.
- Step 6b added; steps 7, 10, 13, 16 and 18 change as listed in the plan. Frame additions: see the plan («Frames needed for chapters»).
- The first release containing chapters should include them from the start, because a later chapter-only data change bumps the collection's pack version and every device downloads that collection's pack again.
- No hadith text is added from OpenITI, so non-negotiable 6 and ADR 0014 are unaffected.

## Developer decisions, 7 Nov 2026

1. **Chapter titles that quote Quran verses are shown as printed** in OpenITI (option c), byte for byte after the closed marker-removal list in §3. They are not rejected and the verse part is not cut. This is a developer-approved exception to the rule that Quran text comes only from verified `content.db` verses: the title is shown as a chapter heading from its source, not as Quran text, and it is never used as Quran text (no ayah link, no search in the Quran index).
2. **The first Hadith release waits for chapters** (step 6b). Plan RB17–RB23 therefore block the Hadith release, not only the chapter files.
3. The recommended defaults for the other open questions are accepted: the licence (CC BY-NC-SA 4.0, credit in the app's Sources screen next to fawazahmed0), Shamela noted as an upstream risk and not named in the credit, the closed title-cleaning list, the pinned release confirmed at download time (6b.0), `openiti` row `granted` (provenance only), and the partly-chaptered layout decided after the 6b.1 per-book report.

## Developer decision, 7 Nov 2026: OpenITI also fills text gaps in Bukhari and Muslim (Proposed until the gap report is accepted)

The developer wants Bukhari and Muslim complete. fawazahmed0 has numbers with no text in any edition (Bukhari 9, Muslim 203, 89 of them in the introduction), and Bukhari also has 6 hadith outside every book range. The developer chose to fill these from OpenITI (the same pinned release and licence as the chapters), under these rules:
- A gap is filled only when OpenITI's hadith at that position is confirmed by its neighbours: the fawazahmed0 hadith immediately before and after the gap (or gap run) match OpenITI's neighbours by the same text check the chapter matcher uses. Anything unconfirmed stays out and is listed.
- The filled text is stored byte for byte as OpenITI has it, after the closed marker-removal list (§3) only, with `source_id` = `openiti` on the row and its own `source_key` and `source_text_sha256`.
- Its pack and the Sources credit name OpenITI for these rows.
- This amends the "hadith text only from fawazahmed0" rule (ADR 0042) for these gap rows only.
- First step: a measured gap report (counts only), for the developer to accept before any import code is written.

**Extended (developer, 7 Nov 2026):** gap filling covers every collection with gaps, not only Bukhari and Muslim: Tirmidhi 74, Nasa'i 86, Malik 29, Abu Dawud 2, Ibn Majah 5 (fawazahmed0 numbers with no text), under the same rules.

## Rule, 7 Nov 2026 (developer): every hadith collection we ship is complete

Every collection that ships has every hadith in its numbering, each with its text and its book (and its chapter once chapters exist). A collection that still has a gap after confirmed OpenITI fills is held back: not packed, not in the manifest, not shown, until the gap is closed (by OpenITI with confirmation, or by Sunnah.com at step 18). The importer reports `complete: yes/no` per collection, and the pack builder refuses an incomplete collection. This replaces the earlier "skip and list" handling of no-text hadith and out-of-range hadith (plan D9, open question 6, RB12) as the shipping rule. Skipped rows are still listed, but they now block that collection.

## Decisions on the gap report (orchestrator, on the developer's behalf, 7 Nov 2026)

The developer delegated these decisions (7 Nov 2026). Source: `docs/plans/phase-7/gapfill-report.md`.

1. **Fill rule is "safe", not just "confirmed".** Both neighbours must match, the unit count must equal the run length, **and** the duplication check must pass: the OpenITI text must not already be contained in a fawazahmed0 neighbour.
2. **Merged numbers count as complete.** When a gap's OpenITI text is already contained in the preceding (or following) fawazahmed0 hadith, the gap is a *merge*, not a hole. The covering hadith is shown with its number range (for example «٥٧٠٩–٥٧١٢»). The merged numbers resolve to it for lookup, bookmarks and search by number. No text is duplicated or added. A merge needs the same neighbour confirmation as a fill, plus a containment score at or above the threshold the measurement sets. Bukhari's 9 gaps are merges (all 4 runs).
3. **Tirmidhi:** pin the OpenITI GitHub repository at a recorded commit SHA, with a SHA-256 per file. It is not in Zenodo 2023.1.8. Same licence.
4. **Nasa'i 3857–3938:** add the missing book as a new `hadith_books` row from OpenITI (title from OpenITI, the same 95% two-way rule), placed between sections 35 and 36, with the 82 safe fills (86 safe in total).
5. **Ibn Majah 2490 and 2497:** a range correction like Muslim's, verified against `reference.book`.
6. **Hadith outside every range:** assign each to the book OpenITI places it in (Bukhari 2384 and 2516 to the previous book, 521, 2711, 3156 and 4978 to the next; Muslim 4968–4971 to the previous, 5885–5886 to the next). Bukhari 2711 is assigned by number (score 0.463) and flagged in the report. The text stays fawazahmed0's.
7. **Muslim's introduction and other "count differs" runs** are classified next as merges, fills or unknown (merge measurement). Whatever is still unknown keeps its collection held back under the completeness rule. Nothing is guessed.
8. **hadithapi.com as a last fallback (developer, 7 Nov 2026).** For gaps that OpenITI can't settle, hadithapi.com (books, chapters, hadith) may supply the text, under the same rules: confirmed by both neighbours, safe or merge, never duplicated. It amends ADR 0042's "hadith data is never taken from hadithapi.com" for these gap rows only. The key is dev-only, so these fills are produced locally and committed as pinned data files (with SHA-256), never fetched in production. Risk: hadithapi.com publishes no terms (RB16), and the developer accepts it.
9. **Gap report follow-up (7 Nov 2026):** the merge threshold is 0.8 (the scores split cleanly: ≤ 0.59 against ≥ 0.86). Tirmidhi is pinned to `OpenITI/0300AH` @ `01a1544130e0236850ef2698923ad01575c5bd7c` with per-file SHA-256s. Ibn Majah gets range corrections (section 10 → 2016–2089, section 15 → 2390–2435), and 5 hadith (2435, 2464, 2476, 2477, 2528) are listed as `reference_exceptions`. The Nasa'i book 3857–3938 passes 100%/100%. Bukhari, Nasa'i, Abu Dawud and Ibn Majah are complete. Muslim, Tirmidhi and Malik get one more measurement round, and anything still unknown keeps that collection held back.

## Note, 7 Nov 2026 (step 6b.3): additive schema change for merges (Q7)

Section 2.3 «No schema change» is superseded for the pack by the merge columns. Step 6b.3 adds three nullable columns to `hadith_entries`: `number_first` and `number_last` (the span a covering row covers, lowest and highest number, including its own) and `source_code` (the origin of a filled row; null for the primary source). `hadith_collections` gains `is_complete` and `incomplete_count` in step 6b.1; these are not in the pack. The pack schema version stays 1 (no hadith pack has shipped). The API lookup by number and the mobile column lists follow in the handoffs of the step 6b document, section 11.
