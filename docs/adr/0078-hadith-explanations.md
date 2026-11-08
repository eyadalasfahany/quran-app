# 0078 — Hadith explanations (شرح) from HadeethEnc and classical commentaries

Date: 2026-11-08 · Status: **Proposed** (the developer asked for explanations on 8 Nov 2026; nothing here is Accepted until the developer accepts the defaults in «Open decisions») · Amends ADR 0042 (decision 1: HadeethEnc work deferred; D2 in `docs/plans/phase-7.md`; §5 «grades hidden» is not touched here), spec §5/§6 (the deferred `hadiths`/`hadith_translations` text), `docs/content-plan.md` (HadeethEnc row; Shamela-derived rows). Does not amend ADR 0076 (chapters). Plan: `docs/plans/hadith-explanations.md`.

Numbering: 0078 is free (`docs/adr/` ends at 0077; `git log --all` shows no 0078 file). The folder has pre-existing duplicate numbers (0042, 0043, 0044); not touched.

## Context

The reader shows the hadith text and its source line only (`apps/mobile/src/features/hadith/components/HadithReaderCard.tsx`, `HadithDetailsPanel.tsx`). ADR 0042 deferred HadeethEnc (explanations included) and the Phase 7 frames say «No explanation section» (`docs/plans/phase-7/step-08-frames.md`). The developer now wants explanations, **from every usable source**, and has ruled (8 Nov 2026) that **licences and terms are not a filter**: sources are chosen on coverage, reliability of the hadith mapping, text quality and effort. Each source's provenance and terms are still recorded (credit, risk note). The technical rules stay: stored as received, no generated text, a closed markup-removal list, pinned inputs with SHA-256, no scraping that a server blocks.

Non-negotiable 6 (no generated religious content) means every explanation is text a real author or publisher wrote, stored as received. Taybah writes none, summarises none, and does not trim or "clean" any (HadeethEnc's own terms also forbid modification, addition and deletion; `docs/adr/0044-duas.md` records them).

Facts this ADR rests on (all measured 8 Nov 2026; counts only, no religious text printed; method in the plan, «Measurements»):

- **HadeethEnc** (public API `https://hadeethenc.com/api/v1`, language `ar`): 7 root categories; the union of their hadith lists is **3,574** distinct records (root counts sum to 4,273, so they overlap; the snapshot gives the exact figure). In a random sample of 200: `explanation` 200, `hints` («الفوائد») 200, `reference` 200, `grade` 200, `words_meanings` 141, `hadeeth_intro` 49. Average explanation 579 characters, hints 398, `words_meanings` 202; longest explanation 4,279. About 2.4 KB per record in UTF-8, so **about 8.5 MB raw for 3,574 records**.
- **Mapping to our collections.** `attribution` and `reference` name a collection in 197 of 200. 103 of 200 references end in a bare number «(n)», but this is the cited edition's number and is not reliable: only 38 of those 103 are confirmed by our text at containment ≥ 0.5. **Text matching with the repo's `HadithWordSet` containment** (share of the HadeethEnc matn's words found in our stored Arabic text, `app/Domains/Hadith/Overlay/HadithWordSet.php`) against the collections the record names, accepting only a best match that beats the second best by ≥ 0.1: **171 of 197 (87%) at containment ≥ 0.7, 177 (90%) at ≥ 0.5**; 18 to 20 (9–10%) are ambiguous (repeated narrations inside one collection); the rest (3% to 4%) fall below. Precision (wrong matches among the accepted) is **not measured**; a negative-control run is step 2 of the plan. (An earlier run with the `text_search` column gave 2 of 200 at ≥ 0.9; that was a normaliser mismatch and is discarded.)
- **Sunnah.com**: no key yet, and the site returns HTTP 403 to automated requests, so it is **not scraped**. The pinned Sunnah.com-derived datasets carry no explanation field: meeAtif/hadith_datasets rows have `Book, Chapter_Number, Chapter_Title_Arabic, Chapter_Title_English, Arabic_Text, English_Text, Grade, Reference, In-book reference`; AhmedBaset/hadith-json has `id, idInBook, chapterId, bookId, arabic, english` plus book metadata (`apps/api/storage/app/private/sources/datasets/`; only the Muslim, Tirmidhi and Malik files are on this machine). Sunnah.com's own explanations wait for its key (plan step 18) and for a check of whether its API has such a field.
- **Classical commentaries exist in the pinned OpenITI release 2023.1.8** (Zenodo `10.5281/zenodo.10007820`, `data.zip`, 67,557 members, read by range request): Fath al-Bari (3 versions, 29.8–32.1 MB each), Minhaj/Sharh al-Nawawi on Muslim (3 versions, 7.1 MB), Tuhfat al-Ahwadhi (3 versions, 12.5–12.7 MB), Awn al-Ma'bud (4 versions, 10.7–14.5 MB), Hashiyat al-Sindi on Nasa'i (3 versions, 1.7 MB) and on Ibn Majah (1 version, 4.7 MB), Sharh al-Zurqani on the Muwatta (3 versions, 0.25–9.0 MB), al-Muntaqa by al-Baji (2 versions, 12 MB), and Ibn Daqiq al-Eid's Sharh al-Arba'in (1 version, 0.2 MB). Tirmidhi's Sunan itself is absent from this release (`docs/plans/phase-7/gapfill-report.md`), but the Tuhfat al-Ahwadhi commentary is present.
- **The same Shamela books are in a public Hugging Face dump**, `AuthenticIlm/Shamela4_Full_DB` (card licence MIT; 8,589 books; commit `07554bee488a12955dd5231d08487ae7ce767d1e`; extracted 2026-04-26). One folder per book with `pages.jsonl` (one JSON row per printed page), `toc.jsonl` and `manifest.json`, so no markup parsing. Its Shamela book ids equal the OpenITI `Shamela####` ids (Fath 1673, Minhaj 1711).

## Decision (proposed)

### 1. One feature, several sources, several explanations per hadith
A hadith can have several explanations, each from a different source, each with its own credit and origin. They are separate sections in the reader (collapsed by default), never merged, never reordered inside a section, never shortened.

### 2. Sources, in this order of work
| Order | Source | Why this order |
| --- | --- | --- |
| 1 | HadeethEnc (`source_code` `hadeethenc`) | Short, readable, ready-made, explicit publisher, small (about 8.5 MB), 87% mappable by rule. |
| 2 | Tuhfat al-Ahwadhi → Tirmidhi (`tuhfat-ahwadhi`) | Best explicit numbering of the classical books (below). |
| 3 | Awn al-Ma'bud → Abu Dawud (`awn-almabud`) | Explicit numbering, weaker agreement. |
| 4 | Fath al-Bari → Bukhari (`fath-albari`), Minhaj → Muslim (`nawawi-muslim`) | The two biggest collections, but numbering must be proved or text-matched. |
| 5 | Sindi (Nasa'i, Ibn Majah), Zurqani/Baji (Malik), Ibn Daqiq (Nawawi's forty) | Small collections or no explicit numbering. |
| Later | Sunnah.com explanations | When the key arrives (step 18) and a field exists. |
| Optional | Dorar.net explanation | Online only; the content plan forbids storing it in offline packs without written permission (`docs/content-plan.md`, Dorar row). |

Classical text source: **the Hugging Face Shamela4 dump pinned to its commit, with OpenITI release 2023.1.8 as the fallback and cross-check** (same books, same Shamela ids). The dump is preferred because pages and tables of contents are already structured JSON; OpenITI's files need a mARkdown parser and are 3 to 4 versions per book. Either way inputs are SHA-256 pinned (per file) and the importer refuses a mismatch.

### 3. Storing as received
- HadeethEnc: `explanation`, `hints` (the list as received), `words_meanings` (stored; shown only if the developer decides), `hadeeth_intro`, `grade` (stored; hidden unless the developer decides), `reference`, `title`, `attribution`, `id` and URL `https://hadeethenc.com/ar/browse/hadith/<id>`. The HadeethEnc terms forbid deletion, so nothing is dropped at import, even what the UI hides.
- Classical: the passage text of the commentary for one hadith, between its numbering marker and the next, stored as printed on the pages. Allowed removals are a **closed list** (as ADR 0076 §3): the page and volume markers `[ص: N]`/`[ج: N]`, mARkdown heading and line markers, and ASCII whitespace at both ends. Everything else (diacritics, footnote marks, the quoted matn inside the commentary, any ayah) stays. Anything outside the list is counted in the report, not cleaned.
- No Quran text is substituted for ayat quoted in an explanation (see Open decision 9).

### 4. Mapping an explanation to a hadith: rule plus report, no hand review
There is no content reviewer (CLAUDE.md, «Hadith… no content reviewer»). ADR 0076 accepted chapters by rule plus a report, and this ADR follows it.
- **HadeethEnc:** candidate collections from `attribution`/`reference` («متفق عليه» names Bukhari and Muslim). Score = `HadithWordSet::containment` of the HadeethEnc matn against each hadith of those collections. Accept per collection when best ≥ 0.7 and best − second best ≥ 0.1. One record may be accepted in several collections (one explanation, several links). Ambiguous or low records are left unmapped and listed in the report. The 0.7 and 0.1 are proposals; step 2 proves them with a negative control (the same score of each record against hadith of a collection it is not in) and sets the final numbers.
- **Classical, explicit numbers** (Tuhfa, Awn; Nasa'i Sindi and Nawawi have bracket numbers that are **not** our numbers, see the plan): bracket number N in the commentary → candidate hadith N, accepted only if the commentary passage and our text agree (containment of our hadith's words in the passage ≥ a threshold set in step 2).
- **Classical, no explicit numbers** (Fath al-Bari, Zurqani, Sindi on Ibn Majah, Ibn Daqiq): order-preserving text alignment against our hadith in position order (passage quotes the matn; Jaccard ≥ 0.5, unique, in order), by the same rule as the gap fills.
- Every link row keeps `status` (`rule`), the rule's evidence string, and the source record key. Links are data; a hadith never shows an explanation without a link row.
- Because a link says «this explanation is about this hadith», and HadeethEnc's `hadeeth` is often a different narration's wording, the section shows the explanation's own title and attribution line (HadeethEnc's `title`, `attribution`) so the reader sees which wording is explained (Open decision 3).

### 5. Data and packs
- MySQL, additive, every table with `resource_id` first and `source_id` → `content_sources` (the ADR 0042 pattern): `hadith_explanations` (one row per source record or passage, stored as received) and `hadith_explanation_links` (`collection slug`, `hadith_number`, `explanation_id`, `status`, `evidence`). One record explains several hadith through several link rows without copying text.
- Not in the collection packs. Putting text in each of the ten collection packs would bump every pack version, so every device would re-download the whole library; ADR 0076's «Consequences» names that cost.
- One **optional pack per source-and-collection** under a new resource group `hadith_explanations` (an amendment to spec §5/§6, which reserved `hadith:{lang}` for HadeethEnc): `hadith_explanations:hadeethenc` (all collections, about 3 MB compressed), then `…:fath-albari`, `…:tuhfat-ahwadhi` and so on (tens of MB each). The user downloads the ones they want; downloads show their size first. Raw sizes are in the plan.
- The app adds the two tables to `content.db` through a JS content migration, so no native change and the release is an OTA update. A collection reader works exactly as today without any explanation pack.
- Links refer to `(collection slug, hadith_number)`, as saved items do, so a later Sunnah.com re-import (step 18) keeps them valid where numbers hold; changed numbers go through `hadith_ref_aliases`, otherwise the linker re-runs.

### 6. Import
- **Dev-only build, committed links only, pinned inputs on the volume.** The HadeethEnc snapshot is taken with the existing `HadeethEncSnapshotter` (`app/Domains/Azkar/Sources/HadeethEncSnapshotter.php`) under a new config prefix (`hadith_explanations.hadeethenc`), kept in the source cache on the volume (ADR 0068) and pinned by its manifest SHA-256 in config, as the Duas snapshot is (`config/duas.php`). The mapper writes the links file `database/data/hadith/explanations/{source}.json` (ids, slug, number, status, evidence; **no text**), SHA-256 pinned in `config/hadith.php`. The text is a few MB for HadeethEnc and tens of MB for classical books, so it is not committed; production imports it from the pinned snapshot at deploy, like Azkar and Duas (ADR 0044 «packs build at web start»).
- A snapshot that is absent is not an error: the source is left out with a reason, and the release goes on (ADR 0042-features-enabled-by-default §6).
- Fetching uses the repo's Laravel client with its own User-Agent. An HTTP 403 or block means skip that source.

### 7. Reader
Collapsed section «الشرح» under the hadith in the reader card (one section per source, each with its credit line and link); «الفوائد» inside the HadeethEnc section. The expanded window shows the same sections in the side panel. The explanation is not hadith text: it is not drawn in Amiri and not centred (Open decision 5). The hadith text stays the main focus. New frames are drawn first (ADR 0010). Grade stays hidden (ADR 0042 D4) unless the developer decides otherwise (Open decision 4).

### 8. Credits
The Sources screen is generated from `content_sources`. HadeethEnc uses the existing string «موسوعة الأحاديث النبوية HadeethEnc.com» (`apps/api/database/migrations/2026_11_01_100013_insert_hadeethenc_content_source.php`; `HadeethEncNotes::SOURCE_NAME`). The grant migration `2026_11_01_100016` overwrote the row's notes, so the old line «benefits are not stored» is gone; a new migration updates the notes to say explanations, benefits and references are stored (ADR 0042-features-enabled-by-default §2 granted the row). Classical commentaries get a `content_sources` row each: the book, the author, «المكتبة الشاملة» as origin, the Hugging Face dump or the OpenITI release, and the licence line (MIT on the dump's card; CC BY-NC-SA 4.0 for OpenITI). Credits name source, author and producer only; grants stay in ADRs.

## Risks, recorded (not filters)
- **Shamela upstream.** The commentary texts come from al-Maktaba al-Shamila. shamela.ws's published terms (a page titled «Shamela MCP Terms of Use», read 8 Nov 2026) say rights in books and editions stay with their holders and grant no reuse beyond the holder's permission or the law; database access is by API key from `mail@shamela.ws`. The Hugging Face card says MIT, but the book texts follow their source. Same kind of risk as RB13 (fawazahmed0) and RB21 (OpenITI), which the developer accepted; listed as **RB25**.
- **HadeethEnc terms** (no modification, addition or deletion; credit the publisher and source) and the `granted`-without-written-terms decision stand (ADR 0042-features-enabled-by-default §2). A rule-based link is Taybah's claim that an explanation belongs to a hadith; the credit line states HadeethEnc's own attribution so the claim is visible.
- **Wrong link** is the main content risk. The rule keeps only unique, high-containment matches, publishes counts in the report, and leaves the rest unlinked.

## Open decisions and recommended defaults (developer)
See `docs/plans/hadith-explanations.md`, «Open questions». Defaults: ship HadeethEnc first as an optional pack; classical packs per book after; rule-accepted links without hand review; grade hidden; `words_meanings` stored and shown inside HadeethEnc's section as received; Arabic only.

## Consequences
- Release blocker **RB25** (Shamela upstream) and **RB26** (link precision not yet measured) in the plan.
- ADR 0042's «HadeethEnc deferred» is amended for explanations only. Daily hadith, topics and the daily push stay deferred.
- Frames needed before any code: reader card with explanation sections, expanded side panel, download rows for explanation packs.
- No change to `hadith_entries` or the collection packs; no native change.
