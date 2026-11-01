# Azkar — Phase A: source research

Date: 2026-10-31 · Status: research complete; developer decisions recorded in ADR 0031 · Branch `ft/azkar`

This is the evidence file for the Azkar feature. It records what each candidate source actually provides, under which terms, and which fields Taybah can and cannot fill. No ingestion, schema or UI work starts until section 7 is answered. Nothing here is generated religious content: every religious field below comes from a named source, or it is recorded as a gap.

## 1. Candidates checked

| Source | What it is | Checked how | Result |
| --- | --- | --- | --- |
| **OpenDua** (Ihsan Labs, Human Development Fund) | Structured Hisn al-Muslim: Arabic, English, transliteration, steps, repeat counts, one reciter | Site pages, HTTP API, and the full v0.0.4 JSON download, inspected field by field | **Best structured source.** Licence for editorial layers is clear; audio and Arabic-text rights are not public (section 3) |
| **Dorar** (الدرر السنية, dorar.net) | Hadith encyclopedia with gradings | dorar.net pages and the historic `dorar_api.json` endpoint | **Every request returned HTTP 403** (automated access blocked). No official API documentation or terms could be read. Only unofficial scraping wrappers exist on GitHub and pub.dev |
| Hisn al-Muslim printed book (Sa'id ibn Ali ibn Wahf al-Qahtani) | The canonical work, with takhrij footnotes | Web search for its reprint terms | Publisher listed as the author (42nd ed., 1436 AH). **No reprint or redistribution terms found online**; free PDFs online are third-party aggregators |
| hisnmuslim.com | Popular Hisn al-Muslim site, credited by some apps for audio | Web search | No documented API, no published terms found |
| Community JSON repos (e.g. `rn0x/Adhkar-json`, `alihmada/Islamic-APIs`) | Scraped copies | Not adopted | Provenance and rights not documented; the content plan already marks Hisn al-Muslim JSON "Later, after permission" |

## 2. OpenDua: what the data actually contains

Pinned file: `https://opendua.hdfund.org/v0.0.4/catalogue.json` (schemaVersion 2.0.0, dataVersion 0.0.4, released 2026-09-09), downloaded 2026-10-31.
SHA-256 `231dfca7b1d0b5bea8ead8125c8d556121a115c40c9e348e08f4b3ede5194958` (746,193 bytes). CSV twin: `435bb7ccbe38f2bb35fb7a37f2d46a176d4f4fceae9096394dc6249e1ac6388d`.
API `https://api.opendua.org/v2` (no key, 60 requests/min per IP, ETag, versioned URLs kept permanently) reports the same counts.

**Coverage (measured from the file, not the website):**

| Measure | Count |
| --- | --- |
| Collections | 1 (`hisn-al-muslim`) |
| Chapters | 132 (number + **English title only**) |
| Entries | 267 (230 `invocation`, 21 `instruction`, 16 `narration`) |
| Distinct duas (Arabic + transliteration + translation) | 262 (13 Arabic strings appear in more than one entry) |
| Recordings | 249 MP3 tracks, 230 entries with audio, one reciter (Muhammad Jumah), 6,371 s total, 80 kbps mono |
| Recitable entries without audio | 0 |
| Entries with an explicit repeat count (`times`) | **31** (values 3, 4, 7, 10, 33, 34, 100) |
| Entries with morning/evening variants (`condition`) | 10 (13 entries have more than one variation) |
| Entries containing Quran text (﴿ ﴾ marks) | 15 entries (4, 50, 70, 71, 75, 76, 99, 100, 101, 110, 135, 206, 207, 235, 236), 16 text fields, 22 passage occurrences, 21 unique. Entries 70, 76 and 99 hold three each; entry 110 is instruction-only; entry 207 repeats its dua in both variations. Verified by the step-3 dry run |
| Instruction steps | 60: 56 Arabic + English, **4 English only** |
| Narration steps (book's own context and virtue wording) | 74: 66 Arabic + English, **8 English only** |
| Topical tags | 19 (OpenDua editorial; 91 entries carry more than one) |
| Entry `references` non-empty | **0 of 267** |
| Dua `references` non-empty | **0 of 262** |
| `referenceWorks` | **0** |
| Grading fields | **none** |
| Review status per entry | **not in the file** (changelog v0.0.1: "every entry is marked `sourced`, not `reviewed`") |
| HTML in text | none · bidi/zero-width controls: none · NBSP: none |

Field names that exist: `entry.id` (stable, never reused), `slug`, `title`, `type`, `chapterId`, `sourceReference` (the Hisn al-Muslim number), `tags[]`, `variations[].{id,label,condition,steps[]}`, `steps[].type` (`recitation` | `instruction` | `narration` | `repeat`), `steps[].arabic`, `steps[].text`, `steps[].speaker`, `items[].times`, `items[].dua.{id,arabic,transliteration,translation,placeholders[]}`, `recordings[].{id,reciterId,url,durationSeconds}`. No file size per recording.

## 3. Licence findings

Quotes are verbatim from the pages, fetched 2026-10-31.

**Editorial layers: clear.** `https://opendua.hdfund.org/developers`:
> "OpenDua's independently authored English, transliteration, editorial metadata and dataset structure are licensed under CC BY 4.0."

Required attribution (`attribution.txt`, same page):
> "OpenDua dataset v0.0.4 (https://opendua.org), by Ihsan Labs at the Human Development Fund. Based on Hisn al-Muslim by Sa'id ibn Ali ibn Wahf al-Qahtani. OpenDua editorial text and dataset structure are licensed CC BY 4.0. Recitation by Muhammad Jumah for OpenDua. OpenDua makes no ownership claim over the underlying religious texts."

**Arabic text: not licensed by anyone we can cite.**
> "OpenDua makes no ownership claim over the underlying Quranic, hadith or supplication text."

The Quran and hadith wording itself is not ownable, but the edition's selection, ordering, chapter structure and footnotes belong to the book. We found no reprint terms for Hisn al-Muslim. This needs a decision (section 7, Q1).

**Licence pages are missing.** The catalogue's `licences` block names an "OpenDua Data Licence" (`https://opendua.org/licence/data`) and an "OpenDua Audio Licence" (`https://opendua.org/licence/audio`). **Both URLs return HTTP 404**, as do `/licence/*` and `/license` on opendua.hdfund.org. The site text says CC BY 4.0; the file names a custom licence we cannot read.

**Audio: not licensed for us.**
> "The recitation was recorded for OpenDua under a separate written agreement and is not offered under the dataset licence."

The downloads page says "For apps, ship the archive rather than streaming from us: it is faster for your users and works offline." That is advice, not a grant. No public audio terms exist. **Taybah may not stream, download, bundle or re-host these recordings until OpenDua grants it in writing.** Contact: `opendua@hdfund.org`.

**Dorar:** nothing could be read (HTTP 403). No terms, no fields, no access rules. Dorar is not usable as a source or a verifier until the developer reads its terms in a browser or gets written access.

## 4. Source matrix

| Field | Primary source | Fallback | Store offline? | Attribution | Verified? |
| --- | --- | --- | --- | --- | --- |
| Arabic dhikr text | OpenDua `dua.arabic` (from Hisn al-Muslim) | none | Yes, if Q1 allows | Hisn al-Muslim + OpenDua line | Structure verified; **rights of the Arabic edition unconfirmed** |
| Quran text inside a dhikr (15 entries) | OpenDua string, stored byte-for-byte | Taybah's Tanzil/QF text by verse key | Yes | As above | Not cross-checked against Tanzil yet (Q4) |
| Repeat count | OpenDua `items[].times` | none | Yes | OpenDua | **31 entries only.** The other 236 have no stated count (Q3) |
| Instructions (e.g. «يبدأ برجله اليمنى») | OpenDua `steps[type=instruction].arabic` | none | Yes | OpenDua | 56 with Arabic; **4 English only** |
| Book's context/narration wording | OpenDua `steps[type=narration].arabic` | none | Yes | Hisn al-Muslim | 66 with Arabic; **8 English only** |
| Chapter (canonical) | OpenDua `chapterId`, `number` | none | Yes | Hisn al-Muslim | **English titles only; no Arabic chapter titles** (Q2) |
| Occasion | OpenDua chapter + `variations[].condition` (morning/evening) | none | Yes | OpenDua | Usable as structure. No separate occasion field exists |
| Explanation / meaning | **none** | Dorar (blocked) | — | — | **Gap: empty** |
| Reason / context | Book's narration step, where one exists | none | Yes | Hisn al-Muslim | Partial; not a separate field upstream |
| Virtue | Book's narration step, where one exists (e.g. Hisn 81) | none | Yes | Hisn al-Muslim | Partial. Telling narration from virtue would need human review, not inference |
| Hadith reference (takhrij) | **none** (`references` empty in all 267 entries) | Book footnotes (rights unknown) or Dorar (blocked) | — | — | **Gap: empty** |
| Grading | **none** ("gradings are pending") | Dorar (blocked) | — | — | **Gap: empty** |
| English translation | OpenDua CC BY 4.0 | none | Yes | OpenDua CC BY line | Licence clear; **conflicts with ADR 0014 for the 15 Quranic entries** (Q5) |
| Transliteration | OpenDua CC BY 4.0 | none | Yes | OpenDua CC BY line | Licence clear; ADR 0014 bans transliteration of the Quran (Q5) |
| Audio | OpenDua recordings (Muhammad Jumah) | Taybah-owned recordings later | **No** | — | **Blocked: no licence** (Q6) |
| Tags / UX category | OpenDua 19 tags (editorial, CC BY) | Taybah mapping documented per chapter | Yes | OpenDua | Derived from data, never from wording |

## 5. Content gaps (what we cannot provide today)

1. **Explanation / meaning**: no licensed source. Empty.
2. **Hadith reference and grading**: no source in the data; Dorar unreachable. Empty.
3. **Arabic chapter titles**: missing upstream. An Arabic-first app cannot show English chapter names in Arabic, and we must not translate them ourselves.
4. **Repeat counts** for 236 of 267 entries: no stated value. We must not assume "1".
5. **12 steps in English only** (4 instructions, 8 narrations): no Arabic to show in the Arabic interface.
6. **Audio**: all 249 tracks blocked until a written licence exists.
7. **Morning/evening time boundaries**: OpenDua's tag description says "said after Fajr and after Asr". That is editorial text with no scholarly citation, and scholars differ on the evening boundary. Taybah must not pick one silently.
8. **Review status**: OpenDua's own scholarly review "has not begun". Nothing upstream is marked `reviewed`.

## 6. Proposed architecture outline (Phase B, pending section 7)

Recorded so the decisions are visible; to become ADR 0031 and spec edits once section 7 is answered.

- **Pipeline:** OpenDua pinned version (JSON file, not runtime API) → Laravel `Domains/Azkar` ingestion command with a validator and import report → MySQL mirror with provenance → existing pack builder emits an `azkar` content pack → `content.db` tables on the device. The app never calls OpenDua or Dorar.
- **Canonical content (`content.db`):** chapters, entries, variations, steps, duas (Arabic byte-for-byte; a separate `text_search` column normalised with the existing rules), recordings metadata, Taybah category mapping. Provenance per row: `source_collection`, `source_entry_id`, `source_reference`, `source_version`, `source_sha256` (per-text), `imported_at`, `review_status` (`sourced` | `reviewed`), `reviewed_at`.
- **Personal state (`user.db`):** favourites, counter sessions (current count separate from the required count), completions, reminder preferences, downloaded-audio rows. All added to `PERSONAL_TABLES`.
- **Timing:** `timing_type` (`time_period` | `prayer_based` | `event_based` | `anytime`) plus the upstream `condition`, stored as metadata only. Reminder time is a user preference and is never shown as a ruling.
- **Reminders:** one scheduler extending `features/notifications`, shared with Salah step 4 (still unbuilt), with prayer-relative triggers recomputed from `features/salah/data/prayer-times.ts`.
- **Content pack:** a fourth `PackGroup` (`azkar`) beside `tafsirs | mushafs | chapter_recitations` in the shared contract (`apps/mobile/src/core/sync/content-tables.ts` ↔ `apps/api/app/Domains/Content/Packs`), so manifest, change feed, ETag and install reuse the existing path. It is an endpoint/contract change, so it ships with the OpenAPI regeneration.
- **Audio:** schema ready (`reciter`, `licence`, `url`, `duration`, `size`). **Off until Q6 is resolved.** The download manager (`features/audio/downloads/manager.ts`) is keyed to Quran audio (`downloads.audio_file_id`, reciter, chapter). Reusing it means an additive `user.db` migration (an owner `kind` plus a generic key) and a generalised enqueue, not a second manager.

## 7. Decisions needed from the developer (blocking)

- **Q1 (licensing, Arabic text):** May we ship the Hisn al-Muslim Arabic text (via OpenDua) with no published reprint terms from the author, given that the dataset licence page is 404? Or do we first write to `opendua@hdfund.org` to ask for the data licence text and confirm the Arabic edition's rights?
- **Q2 (authenticity, Arabic chapter titles):** OpenDua has English chapter titles only. Options: (a) ask OpenDua to publish the book's Arabic chapter titles; (b) the developer types them from a named printed edition, recorded as a reviewed manual source; (c) show only OpenDua's 19 tags (English editorial titles, which would themselves need Arabic). We will not translate them.
- **Q3 (religious interpretation, repeat count):** For the 236 entries with no `times`, should the UI (a) show no count and a single "done" tap, (b) show no count and an open tally, or (c) does a reviewer supply counts from the book? Assuming "once" is a religious claim.
- **Q4 (Quran inside azkar):** For the entries with Quran text (first counted as 14, verified as 15 by the step-3 dry run), show OpenDua's string byte-for-byte in the azkar font, or render those spans from Taybah's own Quran text (the Quran font and the checksum rule)?
- **Q5 (ADR 0014 conflict):** In the English interface, do we show OpenDua's English translation and transliteration? That would follow the hadith rule (ADR 0014: Arabic always, English under it), but it would translate and transliterate Quranic passages, which ADR 0014 forbids. Options: allow for non-Quranic duas only, hide for the Quranic entries, or Arabic only everywhere.
- **Q6 (audio rights):** Audio is blocked. Do we email OpenDua for a written licence that covers streaming, offline download and re-hosting, and build Phase F only after a yes?
- **Q7 (interpretation, morning/evening boundaries):** Which policy and which cited source defines the morning and evening periods? Or do we show only the book's wording («إذا أصبح / إذا أمسى») with no computed window, and let reminders be pure user times?
- **Q8 (scope):** Explanation, grading and references are empty with no reachable licensed source. Do we ship v1 without them, with the fields in the schema and hidden when empty, and look for a source later (e.g. HadeethEnc, already in the content plan)?
- **Q9 (phase):** Azkar has no phase in spec §15. Proposal: insert "Azkar (on-device)" as a new phase after Phase 5, with this folder as its plan, and fix the stale phase pointers in `CLAUDE.md` (says Phase 2) and `AGENTS.md` (says Phase 4).

## 8. Progress log

- **2026-10-31: environment.**
  - Node 26.13.0: the official zip was SHA-256-verified and unpacked to `%APPDATA%\nvm\v26.13.0`, because `nvm install` crashes in nvm-windows. It is used by prefixing PATH; the system Node 24 is untouched. `npm ci` ran clean.
  - PHP 8.5.12: the official ZTS vs17 x64 zip was SHA-256-verified and unpacked beside Laragon's other PHPs, with `php.ini` from `php.ini-development` plus the API's extensions. `composer install` needed `--ignore-platform-req=ext-pcntl` and `--ignore-platform-req=ext-posix`, which don't exist on Windows (Horizon only). Lock file unchanged.
  - Laragon MySQL 8.0.30 was started; a `quran` user plus `quran` and `quran_testing*` databases were added. The project targets MySQL 9.7.
- **2026-10-31: baseline checks on `ft/azkar` (identical to `main` 955ac13; no code changed).**
  - Mobile:
    - ESLint: pass, 5 warnings.
    - `tsc`: **6 errors** in `src/core/layout/hide-scroll-indicators{,.test}.ts`, introduced by 955ac13.
    - Jest: 2,934 of 2,936 pass. `__tests__/router.test.tsx` **fails every run**: the sidebar expectation predates الصلاة. `reader-route.test.tsx` is flaky under load and passes alone.
    - expo-doctor: 7 patch-level mismatches; not upgraded.
    - Design tokens vs HTML: 297 values, 0 mismatches.
  - API:
    - Pint: pass. PHPStan: pass.
    - Pest: 183 of 193 pass. The 9 failures are Windows-only: CRLF output (2), no Redis (2), temp-file locks on `unlink` (4), and a pack-storage failure test that relies on POSIX permissions (1).
- **2026-10-31: Phase A.** Research done; this file written. Stopped at section 7 per the autonomy rule (licensing, audio rights, religious interpretation, ADR 0014 conflict).
