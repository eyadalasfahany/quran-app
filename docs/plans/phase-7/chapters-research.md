# Research: free sources for hadith chapter (باب) titles

Research only, 7 Nov 2026. No app code or config was changed. The question was which free source could fill `hadith_chapters` (`chapter_number`, `source_chapter_key`, `title_ar`, `title_en`, `position`, `hadith_count`) and `hadith_entries.chapter_id` for our fawazahmed0 import (pinned `df57907be35291c91ad6a6691180e22ca9920784`). We would take chapter titles and hadith numbers only, never hadith text or grades.

This file holds no titles and no religious text. It gives counts, keys, URLs and licence names only. Downloads went to the session scratchpad (`chapters/`), and the measuring scripts were kept outside that folder.

## Summary

- **The only usable candidate is OpenITI**, which has real باب headings and fawazahmed0's numbering. It is Shamela-derived and licensed CC BY-NC-SA 4.0 (stated on Zenodo, not in the GitHub repos). Every chapter is a باب heading, its hadith numbers are the same numbering fawazahmed0 uses, and it has folders for all seven multi-book collections. Two caveats:
  - Each text version uses different markup, so we would need a parser per version.
  - Our heuristic parser works for Bukhari, Abu Dawud, Nasa'i and Ibn Majah. It does not yet work for Muslim or Tirmidhi.
- **Most "chapter" datasets are really كتاب (book) level.** That covers hadith-json, hadithapi.com's `chapters` endpoint and the Hugging Face set meeAtif/hadith_datasets.
  - meeAtif repeats one باب-style title for a whole book.
  - Open-Hadith-Data has no chapter column at all.
- **LK Hadith Corpus has real باب titles for the six books, but its numbers are not ours.** It has no licence and its source is not stated.
  - Muslim and Ibn Majah are renumbered 1..N.
  - Abu Dawud is offset by +133/+134.
  - About a third of Bukhari drifts.
  - Using it would need text-based matching.
- **Everything else that has باب titles comes from sunnah.com:** the Quran Foundation hadith API, islamic.app, hadith-json and meeAtif. That puts it in the same rights class as RB13, and Sunnah.com's own API (key pending) is the cleaner way to get the same data.

**Recommendation:** keep `hadith_chapters` empty for v1 as planned (D8). If the developer wants باب before Sunnah.com answers, the only candidate worth a spike is a **dev-only OpenITI matcher**. It would be pinned to one revision, cover four collections first (Bukhari, Abu Dawud, Nasa'i, Ibn Majah), and decide each chapter on its own.

On the task's metric (every hadith number in a chapter exists in our data, within one book), the share of chapters that pass is:

| Collection | Chapters passing |
| --- | --- |
| Bukhari | 92.2% |
| Abu Dawud | 98.1% |
| Nasa'i | 94.1% |
| Ibn Majah | 99.9% |

A stricter check also requires every hadith in a chapter to pass a same-number text comparison. That check is a lower bound, because inline commentary in the Shamela text lowers it. On it, Bukhari and Abu Dawud fall to about 79% of chapters.

The plan's 95% rule judges each chapter on its own, so any chapter that fails is simply left out. That would leave some books only partly chaptered. Decision 5 below covers this.

## Candidates

"Our ten" means bukhari, muslim, abudawud, tirmidhi, ibnmajah, nasai, malik, nawawi40, qudsi40 and shahwaliullah40. The three forties have a single section and no باب level, so they are N/A for every candidate.

| Candidate | URL | Licence (where stated) | Provenance | Covers (of our ten) | Arabic باب titles? | Numbering | Last update | Size / format |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **OpenITI corpus** | <https://github.com/OpenITI> (repos `0200AH`, `0275AH`, `0300AH`, `0325AH`); release DOI 10.5281/zenodo.10007820 | **CC BY-NC-SA 4.0**, stated on the Zenodo record (release 2023.1.8, 17 Oct 2023). The GitHub repos have no LICENSE file. | al-Maktaba al-Shamila and other digital libraries. Version ids name the source, e.g. `Shamela0001681` for Bukhari. Assembled by OpenArabic (Tufts) and then Leipzig/AKU. | Folders for all 7 multi-book collections. Measured: bukhari, abudawud, nasai, ibnmajah. Muslim and tirmidhi exist but need another parser. Malik exists in several versions and was not measured. | **Yes.** mARkdown headings; Bukhari's Shamela version has 3,808 باب headings, Abu Dawud's has 1,867. | Printed-edition numbers in each hadith heading (level-1 `###` headings that start with the number and a dash), the same scheme as fawazahmed0's `hadithnumber` (checked by text; see below) | GitHub `0275AH` last commit 2025-11-28 (Bukhari folder 2025-11-27); Zenodo 2023.1.8 | One plain-text mARkdown file per version, 2–6 MB each |
| **LK Hadith Corpus** | <https://github.com/ShathaTm/LK-Hadith-Corpus> (commit `c45fa64`) | **None in the repo**, so all rights are reserved by default. The README asks for the papers to be cited. CC BY-NC appears only on the LREC 2020 paper (ELRA), not on the data. | Not stated in the repo. It is a parallel English layer; a sunnah.com or published-translation origin is likely but **unverified**. | bukhari, muslim, abudawud, tirmidhi, nasai, ibnmajah (6) | **Yes.** `Section_Arabic` / `Section_English`, with `Chapter_*` holding the كتاب | `Hadith_number` does **not** match ours (see below). Bukhari has 129 non-numeric values such as ranges. | 2020-07-15 | 335 CSV files, one per book, 16 columns (text, isnad/matn split, grades), about 38 MB for the six books |
| hadith-json (AhmedBaset) | <https://github.com/AhmedBaset/hadith-json> (tag `v1.2.0`) | **None** (the GitHub API reports no licence and there is no LICENSE file) | README: "scraped from Sunnah.com" | 7 + the three forties (Musnad Ahmad and others too) | **No.** Its `chapters` are books: 97 for Bukhari, matching the كتاب count. | Sequential `idInBook` | Pushed 2026-03-28 | JSON, `by_book` and `by_chapter` (12.7 MB for Bukhari) |
| Open-Hadith-Data (mhashim6) | <https://github.com/mhashim6/Open-Hadith-Data> | ODbL 1.0 + DbCL 1.0 (LICENSE file) | README: from `ceefour/hadith-islamware` (Islam Ware; that repo is Unlicense) | 7 of ours (plus Ahmad, Darimi) | **No.** Two columns only: number, text. | Own numbering | 2022-07-30 | CSV |
| hadithapi.com | <https://hadithapi.com/docs/hadiths> | **No terms or licence published.** "Free for everyone", with an API key. | Not stated | 6 (no Malik; the plan already notes this) | `chapters` endpoint = **books** (99 for Bukhari, per the plan). Whether there is a per-hadith heading field is **unverified**: no key is set locally and the docs show no response body. | Its own `hadithNumber` | n/a (live API) | JSON API |
| meeAtif/hadith_datasets (Hugging Face) | <https://huggingface.co/datasets/meeAtif/hadith_datasets> (commit `cd62605`) | "MIT" tag set by the uploader. That claim cannot be checked against the scraped source. | sunnah.com (every row links to `sunnah.com/{c}:{n}`) | bukhari, muslim, abudawud, tirmidhi, nasai, ibnmajah | **Not really.** `Chapter_Title_Arabic` is constant within each book (Bukhari: 97 books, 95 distinct titles), so it is one title per كتاب, not a باب level. | sunnah.com numbers, matching ours by text 99.6% (Bukhari) and 99.9% (Abu Dawud) | 2026-02-09 | JSON + CSV per collection (16 MB for Bukhari) |
| Quran Foundation content API, hadith | <https://api-docs.quran.com/docs/content_apis_versioned/hadiths-by-ayah/> | QF API terms (our QF credentials) | Upstream is sunnah.com (error text names `SUNNAH_API_KEY`) | Hadith linked to an ayah only; no list endpoint for collections, books or chapters | `chapterTitle` per language | sunnah.com | live | JSON API |
| islamic.app API | <https://docs.islamic.app/api-reference/hadith-hadiths.md> | None stated | sunnah.com (body "exactly as served by sunnah.com") | Not listed in full | `chapterTitle.ar` | sunnah.com | live | JSON API |
| quranlab/hadith (Hugging Face) | <https://huggingface.co/datasets/quranlab/hadith> | "other" (per-config `LICENSES.md`) | Repackages fawazahmed0, Open-Hadith-Data and HadeethEnc | Same as fawazahmed0 | No (no chapter field in the card) | fawazahmed0 | 2026-10-14 | Parquet |
| Almoooo/dataset_hadith (Hugging Face) | <https://huggingface.co/datasets/Almoooo/dataset_hadith> | None tagged | Not stated | Not checked | Schema has `chapter_no` and `chapter`, in the same style as the sunnah.com-scraped "hadith_dataset" layout where chapter = كتاب. Contents not checked. | `hadith_no` | 2023-11-08 | Parquet + JSON |
| Kaggle | — | — | — | — | One search found no Kaggle dataset with a باب column. The Hugging Face results above are what the search surfaced instead. | — | — | — |

## Alignment with fawazahmed0

"Text check" means: for the same hadith number, the Jaccard similarity of normalised Arabic word sets (diacritics stripped, minimum word length 3) is ≥ 0.5. On random LK/fawazahmed0 pairs, Jaccard ≥ 0.5 gave a false hit in 24 of 100,000 cases (0.024%). That is negligible for a same-number check. For a best-of-window search (LK, ±300) it is not negligible, so the low count of order breaks is the real corroboration there. The check was used only to verify numbering; nothing was stored.

**Revisions measured** (raw GitHub files fetched 7 Nov 2026, not pinned):

| Repository | Commit | Covers |
| --- | --- | --- |
| OpenITI `0275AH` | `44e1c36`, 2025-11-28 | Bukhari, Abu Dawud, Ibn Majah. The Bukhari folder's last change is `47dfd28`. |
| OpenITI `0325AH` | `089e665`, 2025-12-01 | Nasa'i |
| LK | `c45fa64` | |
| meeAtif | `cd62605` | |
| hadith-json | `main` | Pushed 2026-03-28 |

The Zenodo release 2023.1.8 was **not** measured, and its files may differ from these. "Within one book" means every hadith of the chapter falls in a single fawazahmed0 `reference.book`.

### OpenITI (by number, as the planned matcher would work)

| Collection (version) | باب headings with hadith | All numbers in fawazahmed0 | Within one fawazahmed0 book | Every hadith passes text check | One book **and** text check | fawazahmed0 hadith with text covered |
| --- | --- | --- | --- | --- | --- | --- |
| bukhari (`Shamela0001681-ara1`) | 3,710 | 100.00% | 92.16% | 80.05% | 78.60% | 7,349 / 7,580 (96.95%) |
| abudawud (`Shamela0001726-ara1`) | 1,862 | 100.00% | 98.07% | 78.73% | 78.73% | 5,255 / 5,272 (99.68%) |
| nasai (`SunanSughra.Shamela0000829-ara1`) | 657 | 100.00% | 94.06% | 92.24% | 92.09% | 5,649 / 5,679 (99.47%) |
| ibnmajah (`Shamela0001198-ara1`) | 1,390 | 100.00% | 99.86% | 99.50% | 99.35% | 4,313 / 4,338 (99.42%) |
| muslim, tirmidhi | — | — | — | — | — | Not parsed: their versions mark hadith numbers differently (0 numbered hadith found). They need a per-version parser. |
| malik | — | — | — | — | — | Not measured (several partial versions) |

- **Per hadith,** the same-number text check passes for 88.1% of Bukhari (6,565 of 7,451) and 90.9% of Abu Dawud (4,827 of 5,309). So the numbering is the same scheme, with no offset.
- **Most failures look like markup, not renumbering.** The Shamela text carries inline notes and page markers, and some hadith are split differently. Measured: among the hadith that fail the text check, the same number is still the best match among its ±3 neighbours for 593 of 883 in Bukhari and 409 of 481 in Abu Dawud.
- **The parser is heuristic.** A heading counts as a باب when its first word is the word "باب". Each numbered heading is a hadith. Other headings are treated as continuations, because they are mostly multi-line chapter headings and verse citations.
  - No كتاب headings were recognised in Bukhari (0), so some chapters at book boundaries absorb the next book's first hadith. That accounts for most of the 8% "not within one book".
  - Resetting on every unrecognised heading raises Bukhari to 95.08% but drops coverage to 71.74%. So a proper parser is needed, not a tweak.
- **Two other Abu Dawud versions are unusable as-is:** `Shamela0117359` has 8 باب headings and `ShamAY0033960` has no heading levels. Choosing the version is part of the work.

### LK Hadith Corpus (number-based figures first, as asked, then the content check)

| Collection | Chapters (باب) | By number: all numbers in fawazahmed0 / within one book | Is the number the same hadith? | Content-matched (best Jaccard ≥ 0.5 in a ±300 window): chapters fully matched / within one book / contiguous |
| --- | --- | --- | --- | --- |
| bukhari | 3,476 (3,360 titled) | 96.17% / 92.92% | **67.40%** of matched rows have the same number. The rest drift by +5, −1, +1, +4, +7… | 98.73% / 94.85% / 94.51% |
| abudawud | 1,881 (all titled) | 100% / 98.83% | **14.10%**. Offset +134 (3,131 rows) or +133 (982 rows) | 99.89% / 99.84% / 99.73% |
| ibnmajah | 256 (227 titled) | 99.61% / 90.23% | Numbers are a 1..N renumbering in file order | not run |
| muslim | 1,333 | 100% / 88.75% | Numbers are a 1..N renumbering in file order | not run |

- The number-based "100%" figures are spurious. The numbers are dense 1..N and **do not refer to the same hadith** as ours.
- The content match is strong for Bukhari and Abu Dawud. But using it means a pipeline that reads LK's hadith text to place each chapter, and the data has no licence.
- LK's Ibn Majah has only 256 باب, against 1,390 باب with hadith in OpenITI's Ibn Majah, so it looks incomplete.

### hadith-json and meeAtif

- **hadith-json:** 97 "chapters" for Bukhari equal the 97 books, so there is nothing to align at باب level.
- **meeAtif:**
  - Its numbers match ours: 99.64% of Bukhari rows and 99.92% of Abu Dawud rows pass the same-number text check.
  - But grouping rows by `Chapter_Title_Arabic` gives 97 groups for Bukhari and 43 for Abu Dawud, one per book. It has no باب level.

## Rights risk per candidate

| Candidate | Rights position | Risk |
| --- | --- | --- |
| OpenITI | CC BY-NC-SA 4.0 on the Zenodo release. NC is acceptable because the app earns no money. **SA + BY:** chapter data shipped in packs would need attribution and the same licence for that derived table. Upstream is Shamela, whose digital editions carry no clear licence. That is the same class of question as RB13, but not sunnah.com. Classical باب titles are centuries old. Edition numbering and editorial headings in some collections come from modern editors. | Medium–low. Pin the Zenodo release, not GitHub `master`, because the files may differ. |
| LK Hadith Corpus | No licence, so all rights are reserved. Provenance is not stated. | High: unusable without written permission from the authors. |
| hadith-json, meeAtif, islamic.app | Scraped from sunnah.com. The "MIT" on meeAtif is the uploader's claim. | Same as RB13 (sunnah.com rights), with no cleaner grant. And there are no باب titles anyway. |
| QF content API (hadith) | QF terms over sunnah.com data. Ayah-linked hadith only. | Same class as RB13. Coverage is not usable for full chapters. |
| hadithapi.com | No terms, no provenance | Unknown. The plan already limits it to a dev-only titles matcher. |
| Open-Hadith-Data | ODbL / DbCL | Low, but there are no chapter titles |
| Sunnah.com API (planned) | Written terms once the key is granted (step 18) | The intended long-term source. Closes RB13. |

## What the developer must decide

1. **Wait or spike.** Keep chapters empty until Sunnah.com (the current plan), or approve a dev-only OpenITI spike for bukhari, abudawud, nasai and ibnmajah.
2. **Licence terms.** If OpenITI data ships in packs, accept CC BY-NC-SA 4.0. That means an attribution line in the app and the same licence on the derived chapter table. NC is already acceptable.
3. **Shamela origin.** Accept it as the same kind of upstream risk as RB13.
4. **Text-based verification.** May a dev-only matcher read source hadith text (OpenITI and ours) to verify that numbers match, without storing any of it? Number-only alignment is weaker, as LK shows. And the 95% two-way rule from "Titles data" would need a text check to be meaningful here.
5. **Acceptance rule.** Apply the same 95% two-way rule per chapter, and leave rejected chapters out. Note that a book with partial chapters would mix chaptered and unchaptered hadith; the plan has no screen for that today.
   - **With the number and book check only,** the share of chapters kept would be about Bukhari 92%, Abu Dawud 98%, Nasa'i 94% and Ibn Majah 99.9%.
   - **If every hadith must also pass the strict text check,** it would be about Bukhari 79%, Abu Dawud 79%, Nasa'i 92% and Ibn Majah 99%.
   - **Alternatives:** a better parser, or accepting chapters at book level only when every chapter of the book passes.
6. **Title authorship per collection.** Some titles are the author's own (for Bukhari the تراجم are al-Bukhari's) and others come from later editors (often said of Sahih Muslim). That is a claim to verify, not a fact. It decides how the attribution line reads.
