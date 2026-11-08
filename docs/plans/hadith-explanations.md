# Plan: hadith explanations (شرح) in the reader

Date: 2026-11-08 · Status: **plan, not started** · Developer request 8 Nov 2026 · ADR draft: `docs/adr/0078-hadith-explanations.md` (Proposed) · Planner output; no code written.

## Rests on

- `CLAUDE.md` (non-negotiables 1, 3, 6, 7; delegation rule; frontend rule), `.claude/agent-rules.md` (no religious text in fixtures or reports; counts only).
- `docs/plans/phase-7.md` (D2 HadeethEnc deferred, D4 grades hidden, D8 flat books, D11 pack group) and `docs/adr/0042-hadith-collections-source.md`.
- `docs/adr/0042-features-enabled-by-default.md` §2 and §6 (HadeethEnc `granted` by developer decision; no snapshot is not an error), `docs/adr/0044-duas.md` (HadeethEnc terms; `dua_hadith`, `words_meanings` cut line; grade exception scoped to Duas), `docs/adr/0076-hadith-chapters-from-openiti.md` (rule-plus-report acceptance, committed data file, closed markup list, pack re-download cost), `docs/adr/0068-source-cache-on-the-volume.md`, `docs/plans/phase-7/gapfill-report.md` (OpenITI by range request; Tirmidhi Sunan absent from 2023.1.8).
- `docs/content-plan.md` (HadeethEnc row; Dorar row: no offline storage without written permission), `docs/technical-spec.md` §5, §6, §7 (deferred HadeethEnc tables, pack groups).
- Code read: `apps/api/app/Domains/Azkar/Sources/HadeethEncSnapshotter.php`, `Services/HadeethEncLinker.php`, `HadeethEncNotes.php`; `apps/api/config/duas.php` (pin pattern); `apps/api/database/migrations/2026_11_01_100013*`, `…100016*`, `…120004*`, `2026_11_07_110003*`; `apps/api/app/Domains/Hadith/Overlay/HadithWordSet.php`; `apps/api/app/Domains/Content/Packs/PackSchema.php`; `apps/api/app/Domains/Content/Enums/ResourceGroup.php`; mobile `features/hadith/components/HadithReaderCard.tsx`, `HadithDetailsPanel.tsx`, `HadithText.tsx`, `features/hadith/data/install.test.ts`. Note: `apps/api/app/Integrations/HadeethEnc/` is an empty folder (`.gitkeep`); the only HadeethEnc client code is the Azkar snapshotter.
- Frames: `screens/frames/hadith/HadithCollReader*.html`, `HadithCollReaderGrade.html`, `HadithCollExpandedReader.html` (listed; their markup is not re-read here; step 3 reads them).

## What the developer decided (8 Nov 2026)

1. Use every usable source for explanations: HadeethEnc, Sunnah.com (when its key arrives), classical commentaries from any Shamela-carrying source, any other source found.
2. **Licences and terms are not a filter.** Rank on coverage, mapping reliability, text quality, effort. Record provenance and terms in one line each.
3. Technical rules stay: stored as received, no generated text, closed markup-removal list, SHA-256-pinned inputs, no scraping that a server blocks (403 means skip).

## Measurements (8 Nov 2026; counts only)

Scripts and raw samples are in the session scratchpad only; none is in the repo. Method is repeated in step 1 so the numbers can be reproduced in the repo.

### HadeethEnc (public API, `language=ar`)
| Fact | Value |
| --- | --- |
| Root categories | 7; root counts sum to 4,273, union of their lists = **3,574** distinct hadith (lower bound until the snapshot; leaf categories not yet cross-checked) |
| All categories in the tree | 493 (`categories/list`), counts sum 15,222 (overlapping) |
| Fields (sample 200, random) | `explanation` 200, `hints` 200, `reference` 200, `grade` 200, `title`, `attribution`, `categories`, `translations` 200; `words_meanings` 141; `hadeeth_intro` 49 |
| Size | explanation avg 579 chars (max 4,279), hints avg 398, words_meanings avg 202, matn avg 352 → about 2.4 KB UTF-8 per record → **about 8.5 MB raw** for 3,574 |
| Reference format | 103/200 end in a bare «(n)»; this is the cited edition's number. Of those 103, 38 agree with our text (containment ≥ 0.5). Not usable as a hadith number |
| Quran quotes | 1/200 explanations or hints contains the ayah brackets ﴿ ﴾; ayat quoted without brackets not measured |
| Fetch | list endpoint `categories/list`, `hadeeths/list?category_id&per_page&page`, `hadeeths/one?id`; the server answered 403 to a default Python urllib request and 200 to curl; the Laravel client in the repo is the one to use, with its own User-Agent |

**Mapping to our collections** (200-record sample; our DB: bukhari 7,580, muslim 7,540, abudawud 5,274, nasai 5,765, ibnmajah 4,343, tirmidhi 3,997, malik 1,854, nawawi40 42, qudsi40 40, shahwaliullah40 40; word sets by `HadithWordSet`, containment of the HadeethEnc matn words in our stored text):

| Rule | Accepted | Ambiguous only | Below |
| --- | --- | --- | --- |
| Named collection(s), best ≥ 0.7 and gap ≥ 0.1 | 171 of 197 (87%) | 18 | 8 |
| same at ≥ 0.6 | 176 (89%) | 19 | |
| same at ≥ 0.5 | 177 (90%) | 20 | |
| Number-first («(n)» then text ≥ 0.5) | 38 of 200 (19%) | | not useful |

197 of 200 records name at least one of our ten collections (3 do not). Estimate: **about 3,100 of 3,574 records mapped by rule, about 3,500 to 4,000 link rows** (a «متفق عليه» record links in two collections). Precision is **not measured**. An earlier run on `text_search` gave 2 of 200 at ≥ 0.9; that was a normaliser mismatch, discarded. Ahmad-only records are expected misses.

### Sunnah.com-derived datasets we pinned
meeAtif/hadith_datasets (`cd62605e…`): keys `Book, Chapter_Number, Chapter_Title_Arabic, Chapter_Title_English, Arabic_Text, English_Text, Grade, Reference, In-book reference`. AhmedBaset/hadith-json (`70b83d6d…`): `id, idInBook, chapterId, bookId, arabic, english` + metadata. **No explanation or commentary field in either.** (Only Muslim, Tirmidhi and Malik files are on this machine, so the other collections' files were not opened; their schema is the same repo layout.)

### Classical commentaries (Shamela books)
Two carriers of the same books (same Shamela ids):

- **OpenITI release 2023.1.8**, Zenodo `10.5281/zenodo.10007820`, `data.zip` 5,794,098,657 bytes, 67,557 members (central directory read by range request). Licence CC BY-NC-SA 4.0 (record page). Files are mARkdown.
- **Hugging Face `AuthenticIlm/Shamela4_Full_DB`**, commit `07554bee488a12955dd5231d08487ae7ce767d1e`, card licence MIT, extracted 2026-04-26, 8,589 books, 34,373 files. Per book: `pages.jsonl` (`page_id, book_id, shamela_page_id, part, page_num, sequence_num, body, footnotes`), `toc.jsonl` (`title_id, page_id, parent_id, title_text`), `manifest.json`, `book_metadata.json`. Folder `07__شروح-الحديث`.

| Collection | Commentary (author, d. AH) | In OpenITI 2023.1.8 (versions, KB each) | In HF dump (book id, pages, TOC entries) | Raw text chars (HF) | Numbering in the text |
| --- | --- | --- | --- | --- | --- |
| Bukhari | Fath al-Bari (Ibn Hajar, 852) | yes: 3 (29.8–32.1 MB) | 1455, 7,996 pages, 5,110 TOC | 33.0 M | no bracket numbers (2 hits); needs text matching and TOC |
| Muslim | Minhaj, Sharh al-Nawawi (676) | yes: 3 (7.1 MB) | 1473, 4,086 pages, 1,145 TOC | 6.1 M | brackets: 2,255 hits, 2,153 distinct, 96% increasing; agree with our Muslim number text in only 28 of 391 sampled passages (7%): **not our numbering** |
| Tirmidhi | Tuhfat al-Ahwadhi (Mubarakfuri, 1353) | yes: 3 (12.5–12.7 MB) | 5801, 4,874 pages, 1,853 TOC | 11.1 M | brackets: 3,200 hits, 3,186 distinct, 98% increasing; **275 of 400 sampled passages (69%)** contain ≥ 0.5 of our same-numbered hadith's words (baseline with the number shifted by 7: 2%) |
| Abu Dawud | Awn al-Ma'bud (Azimabadi, 1329) | yes: 4 (10.7–14.5 MB) | 1948, 4,665 pages, 1,885 TOC | 10.8 M | brackets: 4,572 hits, 4,568 distinct, 98% increasing; **149 of 400 (37%)** agree (baseline 0%) |
| Nasa'i | Hashiyat al-Sindi (1138) | yes: 3 (1.7 MB) | 503, 2,103 pages, 52 TOC | 1.2 M | brackets 2,196 hits; agree in 2 of 381: **not our numbering** |
| Ibn Majah | Hashiyat al-Sindi (1138) | yes: 1 (4.7 MB) | 3538, 5,204 pages, 1,576 TOC | 4.0 M | no brackets; text matching |
| Malik | Sharh al-Zurqani (1122); al-Muntaqa by al-Baji (474) | Zurqani 3 (0.25–9.0 MB), Muntaqa 2 (12 MB) | 532, 4,163 pages, 765 TOC | 8.1 M | no brackets; text matching |
| Nawawi's forty | Sharh by Ibn Daqiq al-Eid (702) | yes: 1 (0.2 MB) | 4135, 129 pages, 43 TOC | 0.12 M | 42 hadith, 43 TOC entries: **TOC entry per hadith** (aligns by order) |

Reading the table: the bracket number counts the commentary's own edition numbers. The agreement figures use a cheap test (our hadith's words found in the next ≤ 6,000 characters), so they are **lower bounds**, and a passage can be right while failing it (a passage that explains one phrase). Only Tuhfat al-Ahwadhi is clearly usable by number; Awn al-Ma'bud needs the text check as the arbiter; Fath, Minhaj, Zurqani and Ibn Majah need text alignment. Per-collection coverage of the commentary is **not measured**; step 6 produces it.

**Pack size** (raw UTF-8 is about 2 bytes per Arabic character; compressed about a third): Fath about 66 MB raw / about 20 MB packed; Tuhfat about 22 MB / 7 MB; Awn about 22 MB / 7 MB; Minhaj about 12 MB / 4 MB; Zurqani about 16 MB / 5 MB; Sindi on Ibn Majah about 8 MB / 3 MB; Sindi on Nasa'i about 2.4 MB; Ibn Daqiq 0.25 MB. A pack keeps only the passages that got a link, so these are upper bounds. HadeethEnc about 8.5 MB raw / 2 to 3 MB packed.

### Other sources looked at
(One-line provenance and terms each; not filters.)

| Source | What | Provenance and terms | Coverage / mapping | Effort | Verdict |
| --- | --- | --- | --- | --- | --- |
| HadeethEnc API | curated explanation + benefits | Named publisher (HadeethEnc.com); terms: no modification, addition or deletion, credit publisher and source; row `granted` by developer decision, no written terms (ADR 0042-features-enabled-by-default §2) | 3,574 records, about 87% mapped by rule | Low: snapshotter exists | **First** |
| Sunnah.com | explanations on some hadith | Needs API key (pending); 403 on automated requests, not scraped | Unknown until the key; no field in pinned datasets | Waits for step 18 | Later |
| OpenITI release 2023.1.8 | commentaries listed above (Shamela-derived) | CC BY-NC-SA 4.0 (Zenodo); upstream Shamela | As the table; mARkdown parsing needed; 3–4 versions per book | Medium–high | Fallback and cross-check |
| HF `Shamela4_Full_DB` | same books as JSON pages + TOC | Card says MIT; texts follow Shamela's; pin by commit sha | As the table | Medium (no markup parser) | **Preferred classical carrier** |
| shamela.ws | the original library | Its «Shamela MCP Terms of Use» (read 8 Nov 2026): rights stay with book holders; API key by mail to `mail@shamela.ws`; no bulk export found | not measured | key request | Not used directly |
| turath.io | Shamela books with a public API | No terms found in search; not requested (a block would mean skip) | not measured | unknown | Not measured; recheck in step 1 if the HF dump has gaps |
| Dorar.net | explanation via approved API token | Content plan: no bulk import, no scraping, nothing in offline packs without written permission | n/a | Online-only lookup | Optional, not first |
| mhashim6/Open-Hadith-Data | nine books, CSV/SQLite; README mentions an «elaboration» field | Licence "other" (not read); last pushed 2022 | not opened | Low to check | Check in step 1 |
| Sanadset 650K (Mendeley) | narrator chains, not explanations | licence blank in results | n/a | n/a | Not an explanation source |

## Recommended source per collection

| Collection | First | Then | Why |
| --- | --- | --- | --- |
| All ten | HadeethEnc (about 87% of its records link; short and readable) | | one small pack |
| Tirmidhi | Tuhfat al-Ahwadhi | | explicit numbers, 69% pass the lower-bound test |
| Abu Dawud | Awn al-Ma'bud | | explicit numbers, 37% pass the lower-bound test, text check decides |
| Muslim | Minhaj (Nawawi) | | text alignment; numbers are not ours |
| Bukhari | Fath al-Bari | | text alignment against the TOC; largest pack |
| Malik | Sharh al-Zurqani | al-Muntaqa | text alignment |
| Ibn Majah | Sindi | | text alignment |
| Nasa'i | Sindi | | text alignment; small |
| Nawawi's forty | Ibn Daqiq | | order alignment, 42 entries |
| Qudsi 40, Shah Waliullah 40 | none found | | HadeethEnc may link some |

## Recommended order of work
1. HadeethEnc (snapshot, rule mapper, optional pack, reader sections). It proves the whole path with the smallest data.
2. Tuhfat al-Ahwadhi, then Awn al-Ma'bud (explicit numbers; reuse the same pack format).
3. Minhaj, Fath al-Bari (alignment mapper), then Sindi, Zurqani, Ibn Daqiq.
4. Sunnah.com explanations when the key arrives (step 18).

## Decisions that need the developer (listed, not decided)

See «Open questions» for defaults. Categories:
- religious interpretation: linking an explanation to a different narration's wording; showing a grade; showing `words_meanings`; Quran text inside explanations;
- licensing and upstream risk: Shamela-derived text (RB25); HadeethEnc terms stand;
- navigation / UI: where sections sit, collapsed default, expanded-window panel, download rows;
- destructive migrations: none (all additive);
- ADR conflicts: ADR 0042 decision 1 and D2 (HadeethEnc deferred), spec §5/§6 reserved `hadith:{lang}`, ADR 0042 D4 (grade), content plan Dorar row.

## Steps (each small, each with its tests)

**Step 0 — Accept the ADR and the defaults.** Developer. Output: ADR 0078 Accepted, with answers to the open questions. Edits it implies: spec §5/§6/§7 (HadeethEnc paragraph, new group), content plan (HadeethEnc, Shamela rows), phase-7 note «D2 amended for explanations».

**Step 1 — Measurement in the repo (dev-only command, no schema).** `hadith:explanations-measure` (refuses production; writes a report under `storage/app/hadith/reports/`, counts only):
- exact HadeethEnc total from a full snapshot (all 493 categories; confirm no leaf adds an id beyond the root union), field presence, Quran-bracket count, unmarked ayah run count against Tanzil words (counts only);
- the mapping run on all records with a negative control (each record against hadith of a collection it is not in) to set the containment and gap thresholds; report accepted, ambiguous, below, per collection, and the false-accept count of the control;
- read `mhashim6/Open-Hadith-Data` and turath.io terms; add to the source table.
Tests: Pest with placeholder text only (`FIXTURE text … — not a hadith`): counting, threshold boundaries (0.69, 0.70, gap 0.09, 0.10), a collection named by «متفق عليه» maps to two, ambiguous stays unmapped, the report contains no text field (key whitelist, as ADR 0076).

**Step 2 — Frames (ADR 0010), developer approval before code.** Draw in `screens/frames/hadith/` (copy a sibling, add the `gx-fig` block to `screens/index.html`, run `npm run check:html -w @quran/design-tokens`):
- `HadithCollReaderExplanation` (+ `Dark`, `English`): collapsed «الشرح» rows under the hadith, one expanded;
- `HadithCollReaderExplanations` with two sources;
- `HadithCollExpandedReaderExplanation`: side panel sections;
- `HadithCollExplanationDownload` and `…Failed`: the optional pack row with size, state;
- `HadithCollExplanationUnlinked`: a hadith with none (no section at all).
Placeholders only («[نص الشرح كما ورد في المصدر]»). Reads: `HadithCollReader.html`, `HadithCollReaderPlain.html`, `HadithCollExpandedReader.html`.

**Step 3 — Schema (additive).** Migrations: `hadith_explanations`, `hadith_explanation_links`; `content_sources` rows for the classical books (insert-only, like `…100013`), and a notes update for `hadeethenc`. Fields (proposed): explanations: `resource_id`, `id`, `source_code` varchar(32), `source_key` varchar(96) (HadeethEnc id or `{book}:{part}:{ordinal}`), `title_ar` null, `body_ar` mediumText (collation `utf8mb4_0900_bin`, byte exact), `benefits_ar` null (JSON text as received), `words_ar` null, `intro_ar` null, `grade_ar` null (stored, hidden), `reference_ar` null, `attribution_ar` null, `source_url` null, `source_sha256`, `imported_at`; links: `resource_id`, `collection_slug`, `hadith_number`, `explanation_id`, `status`, `evidence`, unique on (slug, number, explanation). Tests: migration up/down, unique constraint, collation byte-exactness round trip.

**Step 4 — HadeethEnc snapshot and importer.** Reuse `HadeethEncSnapshotter` with prefix `hadith_explanations.hadeethenc` in the volume cache (ADR 0068), pin in config. Importer (`hadith:import-explanations --source=hadeethenc`) reads snapshot + committed links file; refuses a hash mismatch; stores as received; idempotent; no-snapshot is reported, not an error. Tests: pinned/mismatched snapshot, byte-for-byte storage of a placeholder record, idempotence, no-snapshot path.

**Step 5 — Mapper and links file.** `hadith:map-explanations hadeethenc` (dev-only; writes a proposal and a text-free links file `database/data/hadith/explanations/hadeethenc.json`, SHA in `config/hadith.php`). Thresholds from step 1. Tests: as step 1, plus the file has no text key.

**Step 6 — Pack contract.** New `ResourceGroup::HadithExplanations` (`hadith_explanations`), `PackSchema` tables for the two tables, a pack per source (and collection for classical books), builder, manifest entry, `content:ensure-packs`. OpenAPI/`openapi.json` and `schema.d.ts` regenerate if the manifest shape changes (`npm run generate -w @quran/api-contract`). Tests: pack round trip, size, checksum, a collection pack is unchanged (its version does not bump).

**Step 7 — Mobile data.** JS content migration adds the two tables to `content.db` (so OTA is valid); repository `getExplanationsFor(slug, number)`; install hooks for the optional pack; download row state. Tests beside `install.test.ts` and `content-migration.test.ts`: install, upgrade from a `content.db` without the tables, query with and without a pack installed, several explanations per hadith in a stable order (source order from config).

**Step 8 — Components** (one file each, colocated tests, frontend rule): `HadithExplanationSection` (collapsible, header «الشرح — {source}»), `HadithExplanationBody` (text), `HadithExplanationCredit` (source line + link, reuse `HadithSourceLine` pattern), `HadithExplanationBenefits` («الفوائد»), `ExplanationPackRow` (download row). Tests: collapsed default, expand/collapse and `accessibilityState.expanded`, RTL in Arabic and English, 44 pt target, no raw hex, link press, Dynamic Type; the text is rendered as given (no trim).

**Step 9 — Screens.** Compose the sections under `HadithReaderCard` (compact) and in `HadithDetailsPanel`/expanded reader (side panel). Nothing renders when a hadith has no link or the pack is absent. Visual check on the iPhone 17 simulator against the frames at 390 × 844 (`frame-shot.py`), Arabic and English. Tests: screen tests with and without a pack, scroll anchoring not lost when a section opens.

**Step 10 — Classical sources, one at a time** (each is steps 4 to 9 again, small): importer from the HF dump pinned by commit + SHA-256 per file (OpenITI as cross-check), the closed markup list, the mapper (bracket number plus text check, or alignment), report, pack, row in Sources. Start with Tuhfat al-Ahwadhi. Tests: the closed-list cleaning function with placeholder strings, mapper on a fixture book of 5 placeholder passages, a passage that fails the text check stays unlinked.

**Step 11 — Release.** Server first (push deploys Railway; packs build at web start). App: OTA (`eas update --channel production`) if `npx eas-cli fingerprint:compare` shows no native change; the plan adds no package and no native field. Developer runs the English UI look on a device. Mobile checks `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`; API `composer qa`; contract regenerated if the manifest changed; `composer audit` / `node .github/scripts/npm-audit.mjs` only if dependencies change (none planned).

**Step 12 — Sunnah.com explanations** when its key arrives (ADR 0042 step 18): check whether the API has a commentary field, then a source adapter behind the same tables.

## UI proposal (frames first)

- Under the hadith in the reader card, one collapsed row per source: «الشرح · موسوعة الأحاديث النبوية», «شرح · تحفة الأحوذي»; the hadith text stays the main focus. Inside the HadeethEnc section: the explanation, then «الفوائد»; below, the source line «المصدر: موسوعة الأحاديث النبوية (HadeethEnc)» with a link to the record URL, plus the title and attribution HadeethEnc gives, so the reader sees which wording is explained.
- Expanded window: the same sections in the side panel (`HadithDetailsPanel` pattern), as sheets are not used there (spec §4 rule: panel when it exists).
- Font: the hadith text keeps Amiri, RTL, justified, never centred (memory «Hadith text alignment»; `HadithText.tsx`). **The explanation is not hadith text.** Recommended: IBM Plex Sans Arabic (the UI font), RTL start-aligned, body size, line height 1.7×; a long classical passage is plain prose in the same font. The matn quoted inside a classical commentary is stored as printed and shown with it, in the same font (we cannot separate it without editing the text). Developer to confirm.
- Grade: hidden (D4). HadeethEnc's grade is stored and kept; the Duas exception does not apply here.

## Open questions (each with a recommended default)

1. **Order and scope of sources.** Default: HadeethEnc first, then Tuhfat al-Ahwadhi, Awn al-Ma'bud, Minhaj, Fath al-Bari, the rest; Sunnah.com when the key comes.
2. **Links accepted by rule without hand review.** There is no content reviewer and about 3,500 links cannot be read by hand. Default: yes, by the ADR 0076 pattern (rule + report + thresholds set in step 1); the developer reads the report and may veto a collection.
3. **Linking to a different wording.** HadeethEnc's `hadeeth` is a different narration or a shortened wording of the collection hadith; is attaching its explanation to ours a «modification» or an interpretive claim? Default: attach, and always show HadeethEnc's own title and attribution beside it; unmapped records are not forced.
4. **HadeethEnc grade.** Default: stored, hidden (ADR 0042 D4). Alternative: show with its source line (the Duas exception, ADR 0044-duas decision 7).
5. **Font for explanations.** Default: IBM Plex Sans Arabic, start-aligned; Amiri stays for hadith text only.
6. **`words_meanings` and `hadeeth_intro`.** HadeethEnc's terms forbid deletion; Duas cut `words_meanings` (ADR 0044-duas decision 6). Default: stored in full; `words_meanings` shown in a third collapsed row inside the HadeethEnc section; `hadeeth_intro` shown at the top of the explanation if present. Alternative: follow the Duas cut line.
7. **Pack shape.** Default: separate optional packs under a new group `hadith_explanations`, one per source and (for classical books) per collection; not inside collection packs (re-download cost). Alternative: reuse the reserved `ResourceGroup::Hadith` / `hadith:{lang}` for HadeethEnc only.
8. **Where the classical text comes from.** Default: the HF Shamela4 dump pinned by commit, OpenITI 2023.1.8 as the cross-check. Alternative: OpenITI only (licensed, more parsing).
9. **Quran text inside explanations.** Non-negotiable 1 says Quran text comes only from `content.db`. Explanations quote ayat (1 of 200 HadeethEnc samples uses the ayah brackets; classical commentaries quote many). ADR 0076 §4 raised the same question for chapter titles. **No default**; options: show as received (HadeethEnc's terms and non-negotiable 6 both argue against editing), or flag and hide runs that match Tanzil text. I found no ADR 0044-duas decision that handles it for `dua_hadith.explanation`: that is an existing gap to settle with this one.
10. **Re-import by Sunnah.com (step 18).** Default: links go through `hadith_ref_aliases` where numbers change, otherwise the mapper re-runs.
11. **English UI.** Default: Arabic explanations only, English labels around them; HadeethEnc's English translations are out of scope (ADR 0014 covers Quran only, but the rule «Arabic first» and the size argue for it).
12. **Dorar.net explanations.** Default: not stored; optional online-only lookup later, per its terms.
13. **Download size warning.** Default: show size and require a tap for packs over 10 MB; HadeethEnc pack is offered in the hadith download sheet.

## Release blockers

- **RB25** Shamela upstream rights for the classical commentaries (listed with RB13, RB21); developer accepts or drops each book.
- **RB26** Link precision not yet measured: step 1 control must show an acceptable false-accept count before any pack ships.
- **RB27** Open question 9 (Quran text inside explanations) has no default.
- Frames approved (step 2) before any UI code.
- HadeethEnc terms: credit shown on every explanation section and on the Sources screen; no field edited.
- Not blockers: written confirmation from HadeethEnc (content plan marks it non-blocking), Sunnah.com key.

## Not checked / limits of the measurements
- HadeethEnc totals are the root-category union; the 200-record sample is random, not stratified. Leaf categories were not cross-checked.
- Mapping precision is unmeasured; the 87% is a recall-style acceptance rate.
- Classical agreement figures are a cheap lower bound on one random sample of 400 passages per book; Fath, Minhaj-numbers, Zurqani, Ibn Majah-Sindi and Ibn Daqiq alignment were not run. Coverage per collection is therefore unknown.
- OpenITI member sizes come from the zip index; the OpenITI files themselves were not downloaded or compared with the HF pages.
- turath.io and `mhashim6/Open-Hadith-Data` terms and contents were not read.

## Developer decisions, 8 Nov 2026

1. **The explanation is shown by default** in its own card under the hadith card (not collapsed). Each source gets its own card, with its title and credit.
2. **The hadith text is as large and readable as possible.** The reader's hadith text gets a larger default size than today's 24/48, and still follows the user's text-size setting and Dynamic Type, with line height ≥ 2× so tashkeel never clips. The frames show the larger size.
3. Licences and terms are not a filter (provenance is still recorded for credits).
4. Open: Quran verses quoted inside explanations (question 9). Proposed: shown as printed, as part of the explanation, never used as Quran text (the chapter-titles rule, ADR 0076). Waiting for the developer's confirmation; HadeethEnc (step order 1) rarely quotes verses, so work starts with it.
5. **Approved by the developer, 8 Nov 2026 ("ok"):** the explanation frames (`HadithCollReaderExplained`, `…Dark`, `…English`, `HadithCollReaderTwoExplanations`, `HadithCollExpandedReaderExplained`) and the reader at 28/56. Quran verses quoted inside explanations are shown as printed, as part of the explanation, never used as Quran text (question 9 closed, same rule as ADR 0076 chapter titles).
