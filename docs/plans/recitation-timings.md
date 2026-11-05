# Recitations: Taybah timings and MP3Quran reciters

Status: **plan and ADR 0060 and 0061 accepted (developer, 4 Nov 2026); implementation not started** · Branch: `ft/recitation-timings` · ADR 0060 (timings, accepted) · ADR 0061 (MP3Quran on R2, accepted) · Amends ADR 0052, 0022, 0040, spec §12, the content plan.

Two tracks share one core (the Taybah timings tables and import, ADR 0060):

- **Track A.** Timings made by Taybah for QF reciters 5, 158 and 174, whose QF timings are untrusted (ADR 0052, `apps/api/config/quran.php:101`). No new audio. Reciter 168 is out of scope: it keeps no highlight (ADR 0052 decision 3, confirmed 4 Nov 2026). Shipping is blocked on developer question A1.
- **Track B (the developer's main goal).** MP3Quran reciters, hosted by Taybah on Cloudflare R2, with timings. Pilot: Islam Sobhi. Rights are settled (ADR 0061 decision 1).

## Answers to the two questions

1. **Railway.** No model and no audio analysis there. Everything is prepared on the developer's machine; only committed output ships and is imported at web start (ADR 0060 decisions 1–2, ADR 0044).
2. **CDN.** QF reciters keep QF's URLs (ADR 0008). MP3Quran reciters get Cloudflare R2 behind a custom domain; the app plays the R2 URL directly; the API only puts URLs in packs (ADR 0061).

## Sources read

`CLAUDE.md`, `.claude/agent-rules.md`, `apps/api/CLAUDE.md`, ADR 0008, 0021, 0022, 0040, 0044-packs-build-at-web-start, 0052; `docs/content-plan.md` (139–140, 205); spec §5 (lines 280–307), §6, §12; `apps/api/app/Domains/Content/Sync/Handlers/ChapterRecitationsHandler.php`, `Services/ContentSyncService.php`, `Packs/PackSchema.php`, `Packs/PackBuilder.php`, `Console/EnsureContentPacksCommand.php`, `Enums/ResourceGroup.php`, `docker/start-web.sh`, migrations `2026_10_27_143840_…` and `2026_11_03_082931_…`; `apps/mobile/src/features/audio/data/{timings,reciters}.ts`, `active-ayah.ts`, `downloads/manager.ts`, `features/reader/screens/SourcesScreen.tsx`; `quran-app-screens.html` (frame `Sources`, line 2216); local MySQL `quran`; MP3Quran API v3 and Cloudflare's R2 pricing page (below), read 4 Nov 2026.

## What MP3Quran API v3 provides (live responses, 4 Nov 2026)

The documentation page (`https://www.mp3quran.net/en/api/v3`) returned 404 when fetched; what follows is from the live endpoints. Terms of the API are unpublished (content plan), so the written permission is the basis.

| Endpoint | Gives |
| :--- | :--- |
| `GET https://www.mp3quran.net/api/v3/reciters?language=ar` or `eng` | 244 reciters, 299 `moshaf`. Each moshaf: `id`, `name` (riwayah and type), `rewaya_id`, `moshaf_type`, `server` (a folder URL), `surah_total`, `surah_list` (comma-separated surah numbers). The reciter name comes in the requested language, so Arabic and English names need two calls. |
| `GET …/riwayat?language=eng`, `…/moshaf?language=eng` | Riwayah names (`rewaya_id` 1 is Hafs from Asim: 236 of 299 moshaf) and moshaf types. |
| `GET …/suwar?language=eng` | Surah names. |
| Audio file | `{server}{NNN}.mp3`, for example `https://cdn.mp3quran.net/audio/islam-sobhi/r1/059.mp3`: HTTP 200, 8,680,138 bytes, `accept-ranges: bytes`, ETag, `last-modified`. |
| `GET …/ayat_timing/reads` | 115 readings that have published timings (13,102 surah timings in all; 98 are Hafs), each with `id`, `folder_url`, `soar_count`. `folder_url` matches a moshaf `server`. |
| `GET …/ayat_timing?surah=N&read=R` | A list of `{ayah, start_time, end_time, polygon, x, y, page}` in ms. **Ayah level only; no word timings.** `polygon`, `x`, `y`, `page` point at their own page images and are not used. |

Findings that matter:

- **Islam Sobhi (moshaf 253) has no published timings** (his folder is not in `reads`), and lists 109 of 114 surahs (surahs 37, 39, 40, 45 and 65 are missing). Our aligner is the only source for him.
- **Mishary al-Afasy (reciter 123, Hafs, 114 surahs, `…/mishary-alafasy/r1/`) is in `reads`.** Read 123, surah 59: 24 ayahs, ayah 1 starts at 6,100 ms and the last ends at 624,340 ms; the file is 10,031,163 bytes. QF's Afasy file for the same surah is 10,033,280 bytes with ayah 1 starting at 0 and ending at 9,060 ms. They are different files, so QF's rows cannot be used on it. This makes Mishary the natural cross-check for the accuracy gate (their timings, QF's, and ours against the same audio).
- **Conventions differ between readings.** Read 1 (surah 59) has an extra entry `ayah: 0` from 0 to 8,945 (the part before ayah 1); read 123 has none, and its ayah 1 starts after the basmala. The importer normalises to QF's convention: ayah 1 starts at 0, the earlier span belongs to ayah 1, and the original start is kept in the set row.
- **Hafs only in v1.** 236 of 299 moshaf are Hafs. Other riwayat can divide ayahs differently from the app's text (developer question B2).
- **Moshaf types** include teaching versions («المعلم») and «featured» recitations (`riwayat` endpoint). A teaching recording repeats text and will not align in a single pass; the reciter list the developer picks excludes them unless approved.

## Findings that shaped the design (files and local DB)

- **A `source` column cannot protect QF reciters' Taybah rows.** The snapshot path deletes all files of a recitation and re-inserts them (`ChapterRecitationsHandler.php:137`), and `recitation_timings.audio_file_id` cascades on delete (create migration), so any row in `recitation_timings` would be lost on a QF snapshot; a QF `audio_segment` mutation also removes a same-key row (`skipRow` → `rowExists` → `removeRow`, 195–222). Taybah timings therefore live in their own tables with no foreign key to the file (ADR 0060 decision 4).
- **QF sync is source-scoped.** `ContentSyncService.php:71` starts from `resources->sourceId('qf')`; the resource create (lines 380–390) and reconcile loops (413) use that source id. A resource under another `content_sources` row is not touched. `content_sources` today: qf, tanzil, opendua, hisnmuslim, hadeethenc (local DB). So a non-QF recitation needs no new guard in the handler; a test proves it.
- **Table keys.** `chapter_audio_files.id` is not auto-increment and holds QF record ids (457 to 26,442 locally). `recitations.id` is auto-increment (22 rows today); `resources.unique(source_id, group, source_key)` lets MP3Quran moshaf ids live beside QF ids.
- **Packs and devices need no change.** `PackSchema` (`recitations`, `chapter_audio_files`, `recitation_timings`, lines 128–180) and the device `catalog_resources`-driven reciter list (`reciters.ts`, `RECITATION_GROUP = 'chapter_recitations'`) work from the group, not the source. No audio host is pinned in code. `EnsureContentPacksCommand.php:36–41` builds a pack when the current version has none.
- **QF ayah rows** (Afasy QF 7): rows touch; word 1 can start before the ayah (59:2: ayah 9,060, word 1 8,935); 59:24 ends at 622,530 against a stored 622,000 (`active-ayah.ts` 45–53 handles the early word). For X:1, X not 1 or 9, all 112 trusted rows per reciter start at 0; for reciters 13, 159, 160, 175 and 176 word 1 starts at 5–10 s on average, so the ayah 1 span includes the basmala and segments exclude it.
- **Word positions need a rule.** QF `segments` are `[position, start, end]` over QF words (`word_layouts`: 77,429 `word` rows, 6,236 `end` rows, mushaf 1). Rules tested against all 6,236 verses: drop waqf tokens, drop the 4-token basmala on ayah 1 (not surahs 1 and 9), merge a detached vocative-particle token into the next token. 6,215 verses match QF's word count; 21 do not (keys include 2:181, 3:66, 3:119, 4:109, 7:19, 8:6, 11:29, 11:30, 11:44, 11:52, 11:64, 11:85, 11:89, 11:93, 13:37) and ship `segments` null.
- **Repeats are common.** 991 of Afasy's 6,236 QF ayahs repeat positions (2:14 replays words 7–11). A monotonic pass misses them.
- **Device side is unchanged.** `timingsFor` needs one row per ayah of the surah; `timingsFitAudio` needs the last ayah to end ≤ 2 s past, and ≤ max(15 s, 5%) before, the player's duration (`timings.ts`). Ending the last ayah at the measured duration passes. Segments are integer triples.
- **Size** (Afasy, real): 6,236 ayah rows, 1,783,080 bytes of segments JSON, 502,022 bytes gzipped; about 2.2 MB per reciter with word segments, about 0.2 MB ayah-level only. 4 QF reciters ≈ 8.8 MB. See "Repo size at scale" for track B.
- **Time:** about 3 min of CPU for a 9 min file. A reciter of ~114 surahs is on the order of 10+ hours; measure in step 1.
- **Offline downloads.** `downloads/manager.ts` (lines 196, 242, 493) compares the downloaded byte count with `chapter_audio_files.size_bytes`, so the ingest records exact bytes. QF's 7-day retention question does not apply to MP3Quran files; the same manager handles an R2 URL.

## Track B data model (accepted 4 Nov 2026)

| Piece | Where | Why |
| :--- | :--- | :--- |
| Source | new `content_sources` row `mp3quran`: `permission_status` `granted`, attribution columns, notes say the permission is held by the developer (no wording quoted) | the spec §5 table already exists for this; Sources screen reads it |
| Recording | `resources` row, source `mp3quran`, group `chapter_recitations`, `source_key` = moshaf id | QF sync cannot see it (source-scoped); manifest and packs already serve by group |
| Reciter | `recitations` row (names Arabic and English from the two API languages, `qirat` ← riwayah name, `style` ← type) | ADR 0021; same device table |
| Files | `chapter_audio_files` rows: `audio_url` = R2 URL, `size_bytes`, `duration_ms` = measured, id = `1_000_000_000 + moshaf_id × 1000 + surah` | primary key must not collide with QF ids |
| Timings | `taybah_recitation_timings` + `taybah_timing_sets` (ADR 0060), the same path as track A | one importer, one gate, one pack rule: per file, a Taybah set wins; otherwise the recitation's own rows (none for a non-QF resource, none for an untrusted reciter) |
| Provenance | set row: R2 URL, bytes, sha256, measured duration, source (`mp3quran` published, `aligner`), tool and model versions, original MP3Quran ayah-1 start | audit |

**Schema changes.** No change to the pack schema, the device schema (spec §6) or any endpoint: the manifest, `GET` pack and changes endpoints already work from the resource group (`ContentDeliveryService.php`), so no OpenAPI regeneration and no `schema.d.ts` change; the contract check runs as a gate anyway to prove it. New on the API only: the two Taybah tables (migration, additive), a `content_sources` row, the import commands. The migration needs tests (steps A2, B4).

## Reciters in both catalogues (decided 4 Nov 2026)

When a reciter is in both catalogues, **QF's recitation stays and the MP3Quran copy is hidden** (not imported into the list). The match key is a developer-owned map in config (`quran.mp3quran_duplicates`: MP3Quran moshaf id → QF `source_key`), because ADR 0021 says the device has no reciter key (example: MP3Quran 123 and QF 7, Mishary al-Afasy; 123 is still ingested once for the A6(b) cross-check and not listed). Timings do not depend on this: a Taybah set for a file wins, otherwise QF's rows apply. QF reciters 5, 158 and 174 stay on QF's recordings with Taybah timings (track A).

## Decisions

| # | Decision | Status |
| :--- | :--- | :--- |
| D1 | Local tool only; output committed; import at web start (ADR 0060 1–2) | accepted, developer, 4 Nov 2026 |
| D2 | Taybah timings in their own tables, shared by both tracks, as an override per surah file (ADR 0060 4, 5, 10) | accepted, developer, 4 Nov 2026 |
| D6 | The untrusted list keeps its ADR 0052 meaning; reciter 168 unchanged | developer, 4 Nov 2026 |
| D3 | MP3Quran rights basis, R2 hosting, attribution (ADR 0061 1–3) | developer, 4 Nov 2026 |
| D4 | Copy-once ingest, key layout, manifest import, id range, Hafs only for v1 (ADR 0061 4–10) | accepted, developer, 4 Nov 2026 |
| D5 | Version and `changes_floor_version` bump together, only when a digest changes | accepted, developer, 4 Nov 2026 |

## Settled by the developer (4 Nov 2026)

- The MP3Quran written permission is in the developer's hands (not in the repo; its wording is not quoted anywhere). Done.
- Reciter 168 stays with no highlight; out of scope.
- **Precedence:** a Taybah timing is used instead of QF's only where one exists for that surah file. Everywhere else behaviour is unchanged: trusted QF reciters keep QF timings; reciters in `quran.untrusted_timing_recitations` keep playing without highlight. The list keeps its ADR 0052 meaning; Taybah timings are an override layer on top (ADR 0060 decisions 5, 6, 10).
- The two dev-only models are exempt from the 12-month rule (ADR 0060; content-plan version table row).

## Settled by the developer, continued (4 Nov 2026)

- **Thresholds (A6):** accepted as proposed.
- **Pace:** a reciter ships only when complete; no surah-by-surah shipping (a missing surah would play «بدون تتبع»).
- **The 21 verses** whose QF word count the rules do not match: ayah-level highlight only (`segments` null); no hand-written merge table for now.
- **Riwayah:** Hafs only in v1.
- **Duplicates:** QF's copy kept, MP3Quran copy hidden (above).
- **Missing surahs** (a reciter without a file for a surah, for example Islam Sobhi): shown as unavailable in the list and skipped in continuous play. Needs a Jest/player test and, if the list row looks different, a frame (B1 below).
- **Scale:** pilot with Islam Sobhi first; the search/grouping frame for a long reciter list is designed later.

## Still open

- **A1 (blocks shipping track A only).** QuranicAudio's site says personal use only (`docs/content-plan.md:140`); the MP3Quran grant does not cover QF's files. May we publish timings derived from analysing them?
- **A4.** Checked for step B4 (4 Nov 2026), against the 12-month rule: **boto3** 1.43.123 ✓ (released 30 Oct 2026, Apache-2.0; runtime). **httpx** ✗ (last release 6 Dec 2024), so it is not used: the tool uses stdlib `urllib.request`. **Dev-only mock:** **moto** 5.2.5 ✓ (released 27 Oct 2026, Apache-2.0), used as the S3 mock (`moto[s3]`); `botocore.stub.Stubber` was the fallback and is not needed. pytest 9.2.0 ✓ (27 Oct 2026, dev-only).
- **B5.** Wording of the MP3Quran credit on Sources.
- **B6.** Cloudflare account, bucket, custom domain (for example `audio.taybah-app.com`), billing alert amount, who holds the keys.
- **Repo size at scale (below):** commit timings for up to about 20 reciters, then bundles on R2; revisit after the pilot.

## Local pilot (4 Nov 2026)

Islam Sobhi surah 59 was imported into the **local MySQL only**: `content_sources` code `mp3quran`, resource 56, `chapter_audio_files` id 1000253059 (= 1e9 + moshaf 253 × 1000 + 59), audio URL `cdn.mp3quran.net/...` for the pilot only (production uses R2 URLs, ADR 0061). Word positions used the three rules (waqf tokens dropped, 4-token basmala dropped, detached vocative particle merged); all 24 ayahs matched QF's word counts. Lesson: insert Arabic through a utf8mb4 connection; the `mysql` CLI default garbled `name_ar`.

## Repo size at scale (track B)

Ayah-only timings from MP3Quran are about 0.2 MB a reciter (6.2k rows); with our word segments about 2.2 MB. The audio manifest is about 114 entries × ~250 bytes ≈ 30 KB a reciter. Twenty reciters with words are about 45 MB of JSON in git; 100 would be about 220 MB. Proposal: commit up to about 20; beyond that publish a timing bundle per reciter to R2 and import it by a manifest that pins its sha256, as Azkar does for snapshots (ADR 0044). The developer decides (B8).

## Steps

Each step is one Haiku brief; the orchestrator reviews the diff. Tests are written with the step.

### Shared core (both tracks)

**A1. Tool output format and scale probes** (`tools/recitation-align/`, Python; the other agent owns the move). Output JSON per surah: `version`, `recitation_key`, `chapter_id`, `audio_url` (verbatim), `audio_bytes`, `audio_sha256`, `measured_duration_ms`, `tool_version`, `models`, `ayahs[]` of `{verse_key, start_ms, end_ms, confidence, segments|null}` with QF positions. The QF-position map comes from a read-only `word_layouts` dump. Probes: Al-Baqarah (about 2 h: memory of one CTC pass, 20 s chunk boundaries) and Afasy's 991 repeat ayahs against tool confidence. Tests (pytest): position map on placeholder fixtures; basmala offset; contiguous rows, last = measured duration; schema; refuses a changed URL or sha. Spec §7, §12.

**A2. Schema** (additive; `.ai/rules/migrations.md`). `taybah_timing_sets` (`recitation_id`, `chapter_id` unique, `audio_url`, `size_bytes`, `sha256`, `measured_duration_ms`, `source`, `tool_version`, `models` json, `original_first_start_ms` null, `digest`, `imported_at`) and `taybah_recitation_timings` (`recitation_id`, `chapter_id`, `verse_id`, `start_ms`, `end_ms`, `segments` json null; primary key of the three). Foreign key to `recitations` only. Models, factories, repository contract and Eloquent class per the layering rules. Tests: migration up/down, factory, `start_ms < end_ms`.

**A3. Import command.** `recitation-timings:import` reads committed JSON. Refuses: a current `chapter_audio_files.audio_url` that differs from the recorded one; missing ayahs; `start_ms ≥ end_ms`; overlaps; a last ayah more than 2 s past the measured duration; reciter 168. Every segment position is checked against `word_layouts` (unknown ⇒ that verse's `segments` null, key logged). Idempotent by digest. On a change: bump `resources.version` and `changes_floor_version` together, delete the resource's `content_changes`, dispatch `ResourceContentChanged` (as `2026_11_03_082931_…` does). `recitation-timings:verify` lists sets whose URL no longer matches. Tests (Pest, placeholder ayahs): imports; rerun changes nothing and bumps nothing; URL change refuses; missing ayah refuses; bad position ⇒ null segments; one bump and one event.

**A4. Handler and flag.** `has_word_segments` is true when any file in the pack has segments, from QF rows or Taybah rows (handler lines 121–128, 631–637, `upsertRecitation`; the flag must not be reset to false by a QF snapshot while Taybah segments exist). Tests: a QF snapshot for a listed reciter leaves Taybah rows and the flag untouched; a QF `audio_segment` mutation and a `chapter_audio_file` delete do not touch them; a source-`mp3quran` resource is not touched by a QF sync (fixture with both).

**A5. Pack and release wiring.** The pack snapshot uses, per file, the Taybah rows when a Taybah set matches the current file and `audio_url`, else the recitation's own rows. `docker/start-web.sh` runs the import commands before `content:ensure-packs`, with a WARNING on failure like the Azkar lines. Spec §12 line 672 gets the override sentence; the `quran.untrusted_timing_recitations` config and `ChapterRecitationsHandler::trustsTimings` are unchanged. Tests: a listed reciter's pack has Taybah rows for the files that have a set and no timings for the others; a trusted reciter with no Taybah set is byte-identical; a trusted reciter with one set uses the Taybah rows for that file only; `content:ensure-packs` builds the new version; a URL mismatch leaves the surah out. Mobile: one Jest fixture in `timings.test.ts` with the generated shape (last ayah at measured duration; one ayah `segments` null; one with repeated positions) passing `timingsFor`, `timingsFitAudio` and the active-word search. No other mobile change. Gates: `composer qa`; mobile `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor` (test file only); `npm run generate -w @quran/api-contract` produces no diff.

**A6. Accuracy gate (required before any reciter ships).** (a) Trusted reference: Afasy QF 7 against the tool on surahs 1, 36, 59, 18, 2, using ADR 0052's audit: per-ayah start difference, offset steadiness (IQR, share within 1 s of the median), share of ayah starts within 0.7 s of an audio pause, last ayah against the file end. Proposed pass: median offset within 0.3 s; 95% of starts within 1 s of QF; none beyond 5 s; at least 90% at a pause. Words are compared only on ayahs without repeats; repeat ayahs set the confidence floor (below it: ayah timing, `segments` null); a surah with more than 10% of ayahs below the floor is not shipped. (b) Cross-check on MP3Quran Afasy (read 123, its own file): their published ayah timings, QF-convention-normalised, against ours and against the pause metric. The same gate is the rule for any MP3Quran published timing before it is used. (c) Track A spot-check of 5, 158, 174 on Al-Kahf and two more surahs: at least 90% at a pause and at least 83% steady (ADR 0052's accepted range). Record numbers in an ADR 0060 addendum. Listening is not ground truth.

### Track A

**A7. Per-reciter runs.** One reciter per brief, one surah at a time, files under `apps/api/resources/recitation-timings/{source_key}/`: 174, 158, 5. Run the tool, import locally, run A6(c) on the whole reciter. Failures stay out and keep «بدون تتبع» (the untrusted list is unchanged). The developer commits.

**A8. Track A exit check.** A listed reciter's pack installs on the iPhone 17 simulator over a version-3 pack; highlight follows, jumps and repeats on three surahs including a long one; «بدون تتبع» is gone for those and stays for any left out; the import is safe to run twice.

### Track B

**B1. Documents (developer, no code).** The permission is done and held by the developer. Accept ADR 0060 and 0061; the developer applies this one-line change to `CLAUDE.md` non-negotiable 2 (agents do not edit it): after "the audio URLs QF's API returns (ADR 0008)," insert "Taybah's own audio host on Cloudflare R2 for MP3Quran reciters (ADR 0061; the domain chosen in B6),"; edit the content plan (MP3Quran row: Later → Primary for additional reciters; tick line 205); amend ADR 0022 and 0040 notes; spec §5 note on non-QF recitations and §12 R2 host.

**B2. Sources frame (design).** Draw the MP3Quran credit row on the `Sources` frame in `quran-app-screens.html` from existing tokens; developer approves (ADR 0010, 0013). No code before approval.

**B3. Sources screen.** Add the line to `SourcesScreen.tsx` as its own component (if the row is new) with colocated test; strings in `ar.json` and `en.json`, no hard-coded text; RTL and accessibility label tested; screenshot on the iPhone 17 simulator against the frame at 390 × 844 (`packages/design-tokens/scripts/frame-shot.py Sources`). Gates: lint, `tsc`, Jest, `expo-doctor`.

**B4. Source row and ingest tool** (`tools/mp3quran-ingest/`, Python, uv; separate from the aligner). Steps: fetch and snapshot the catalogue (`reciters` in both languages, `riwayat`, `ayat_timing/reads`) into `apps/api/resources/mp3quran/catalogue.json` with fetch date; for each chosen moshaf and surah in `surah_list`, download `{server}{NNN}.mp3`, check the byte count against `Content-Length`, decode the full file (measured duration), compute sha256, upload to R2 under the content-hashed key with the immutable cache header (S3 API, keys from local env only), then read it back with a HEAD and compare bytes; resume without re-uploading an existing key; write `manifest.json`. Dry-run mode uploads nothing. Tests (pytest, local fake of the MP3Quran server and an S3 mock): resume; truncated download rejected; changed content gets a new key; manifest schema; no credential appears in logs or output. Dependencies: boto3 and httpx checked against the 12-month rule (A4).

**B5. API: source, import command.** Migration/seeder for the `mp3quran` source row; `mp3quran:import` reads the manifest and writes the resource, recitation and file rows (id range rule), sets `has_word_segments` from the Taybah rows, bumps versions only on a digest change, queues the pack like step A3. `start-web.sh` runs it before `content:ensure-packs`. Tests (Pest, placeholder data): rows created with a unique range of ids; second run no-op; a QF snapshot afterwards leaves the rows untouched; a moshaf with a missing surah imports the surahs it has; removing a moshaf from the manifest sets the resource inactive; no R2 credential read by the API.

**B6. Timings for MP3Quran reciters.** For readings in `reads`: fetch their ayah timings, normalise to QF convention, gate with A6(b). For others (Islam Sobhi): `tools/recitation-align --surah N` on the exact uploaded file's bytes (sha matches the manifest), same gate. Output into the shared JSON of step A1. Per-surah failures stay out. Tests: normaliser (read 1 with `ayah 0`, read 123 without), count equals `chapters.verses_count`, last ayah at measured duration.

**B7. Pilot: Islam Sobhi.** Ingest all 109 surahs; align; gate; import. Exit check on the iPhone 17 simulator: the reciter appears in the list, streams the R2 URL, downloads for offline use, highlights ayah and word on three surahs including 59 and a long one, and the player behaves for a missing surah (B7 developer question). Screenshot compared with the Listen frame; no UI change is expected for a single added reciter.

**B8. Reciter list at scale (deferred; after the Islam Sobhi pilot).** Also covers the unavailable-surah row and search/grouping. Frames first, then components with tests, i18n in both languages, `useWindowClass()` layouts.

**B9. Batch reciters.** The developer's list, one reciter per brief through B4–B6, committing manifest and timings (or timing bundles, B8-developer question); billing alert checked after the first batch.

## Release blockers

1. A6 gate passed per reciter, numbers recorded.
2. Track A only: A1 (QuranicAudio-derived timings) answered.
3. ADR 0060 and 0061 accepted (the permission is held by the developer); `CLAUDE.md` rule 2 updated.
4. Sources line approved in the HTML and shipped in both languages before any MP3Quran reciter is visible.
5. Import idempotent on a second deploy (no version bump on a rerun).
6. R2 custom domain live, immutable cache header and range requests verified on one object; billing alert set.
7. `composer qa` green; mobile checks green; contract regeneration shows no diff.

## Rollback

Track A: remove the Taybah rows and bump (the 0052 migration's pattern). Track B: ADR 0061 decision 13.

## Open questions (technical)

(Everything in the developer sections above is settled; only "Still open" remains.)

- Does 20 s chunking without overlap break boundary ayahs on a 2 h surah, and does one CTC pass of Al-Baqarah fit in memory (A1 probe)?
- Which confidence floor separates Afasy's 991 repeat ayahs from clean ones (A6)?
- Do MP3Quran's published timings agree with their own audio better than QF's did for QF's files? Unknown until A6(b).
- The midpoint rule for generated ayah starts (cleaner) differs from QF's late-start quirk by up to about 125 ms (59:2).
- Are MP3Quran file ETags and `last-modified` stable enough to detect a changed source on a re-ingest (the ingest stores both)?

## ADR 0062 steps

Briefs for [ADR 0062](../adr/0062-unavailable-surahs-and-player-reciters.md) (unavailable surahs, the reciters list in the player, speed removed). One brief per step in `recitation-timings/`; each is small and green on its own. Mobile only: no API or contract change (availability comes from the pack's `chapter_audio_files` rows already on the device). Do not commit; the developer does.

| Step | Brief | Frame |
| --- | --- | --- |
| 1 | [0062-step-01-remove-speed.md](recitation-timings/0062-step-01-remove-speed.md) | `PlayerReciters` (utility row) |
| 2 | [0062-step-02-availability-selector.md](recitation-timings/0062-step-02-availability-selector.md) | none |
| 3 | [0062-step-03-unavailable-rows.md](recitation-timings/0062-step-03-unavailable-rows.md) | `ReciterSurahsUnavailable` |
| 4 | [0062-step-04-mini-unavailable.md](recitation-timings/0062-step-04-mini-unavailable.md) | `ReadingMiniUnavailable` |
| 5 | [0062-step-05-continuous-play-skip.md](recitation-timings/0062-step-05-continuous-play-skip.md) | `ReadingMiniSkipped` |
| 6 | [0062-step-06-player-layout.md](recitation-timings/0062-step-06-player-layout.md) | `PlayerReciters` (upper part) |
| 7 | [0062-step-07-player-reciter-list.md](recitation-timings/0062-step-07-player-reciter-list.md) | `PlayerReciters`, `PlayerReciterDownloading` |
| 8 | [0062-step-08-reciter-switch.md](recitation-timings/0062-step-08-reciter-switch.md) (decisions 6 and 7: switch keeps the place; one selected reciter; one current ayah) | same |
| 9 | [0062-step-09-review.md](recitation-timings/0062-step-09-review.md) | all five |

Order: 1, 2, then 3, 4, 5 (each needs only 2), 6 after 1, 7 after 2 and 6, 8 after 7, 9 last.

**Open questions for the developer (in the briefs; defaults given so work is not blocked):**

- Q1. The Azkar player has its own speed and shares `SPEED_RATES`, `SPEED_ICON` and the keys `player.options.speed/speedTitle/rateValue`. ADR 0062 says speed is removed from the app entirely. Default: Quran player only; Azkar untouched (one import line moves).
- Q2. For an uninstalled pack the app cannot know a surah is missing; the row flips to unavailable after the install.
- Q3. Header count of a partial reciter: 109 (default) or 114.
- Q4. Play from the Listen tab with a reciter that lacks the current ayah's surah: no message there (default).
- Q5. Notice wording when several consecutive surahs are skipped (default: «تخطّي {n} سور …»).
- Q6. Player list order with many reciters (default: current first, then catalogue order, the list scrolls).
- Q7. Repeat count restarts at 0 on a reciter switch (default yes).
- Q8. Download finish always auto-plays, even if the player was paused (decision 5 against decision 6; default: auto-play).
- Q9–Q12 (step 8, decision 7), **decided by the developer, 4 Nov 2026:** Q9 reciter page surah ▶ starts at the current ayah when it is in that surah; Q10 recent listens keep their saved position and make their reciter the selection; Q11 name tap selects and `⋯` selects then opens the page; Q12 an uninstalled reciter selected while another plays downloads at once (progress on his row) and auto-switches when done, cancelled by another selection or by stopping, failure keeps playback.

**Decided (developer, 4 Nov 2026):** Q1 Quran player only, Azkar keeps its speed (ADR 0047 unchanged; `SPEED_RATES` moves to Azkar). Step 1 (`0062-step-01-remove-speed.md`) removes the Quran player's speed. Q2 accepted: availability flips after the pack installs, no API change. Q8 a finished download always auto-plays; a plain tap keeps play/pause. Reciter surah list keeps today's `DownloadRow` look and only adds the dimmed «غير متوفرة» state (approved difference from frame `ReciterSurahsUnavailable`). Q3–Q7 take the defaults above.

## API steps

Briefs for plan steps A2, A3, A4, A5 and B5, one per file in `recitation-timings/`, numbered in the order they are built (each is green on its own). API and one Python module only: no endpoint, pack-schema or device-schema change, so no OpenAPI regeneration is expected; every brief carries a contract-diff gate (copy `openapi.json` and `schema.d.ts` to scratch, regenerate, diff against the copies, never against `HEAD` because the tree is dirty). The orchestrator reviews each diff; the developer commits.

| Order | Plan step | Brief | Goal |
| --- | --- | --- | --- |
| 1 | A2 | [api-step-01-schema.md](recitation-timings/api-step-01-schema.md) | `taybah_timing_sets` and `taybah_recitation_timings` (no FK to `chapter_audio_files`), models, factories, `TaybahTimingSource`, `TaybahTimingRepository` |
| 2a | A1 output, A3 (first half) | [api-step-02a-converter.md](recitation-timings/api-step-02a-converter.md) | `recitation_align/export.py`: aligner output to the committed per-surah timing file (QF word positions, ayah rows, provenance) |
| 2b | A3 | [api-step-02b-timings-import.md](recitation-timings/api-step-02b-timings-import.md) | `recitation-timings:import` and `:verify`: validate against the current file and `word_layouts`, idempotent by digest, one version bump per recitation |
| 3 | A4 | [api-step-03-handler-flag.md](recitation-timings/api-step-03-handler-flag.md) | QF handler keeps Taybah rows, keeps `has_word_segments` true while Taybah segments are served, emits no change for a file a Taybah set owns |
| 4 | B5 | [api-step-04-mp3quran-import.md](recitation-timings/api-step-04-mp3quran-import.md) | `mp3quran` content source and `mp3quran:import` from the committed manifest; converges from the local pilot; fixes `isDefault()` for non-QF sources |
| 5 | A5 | [api-step-05-pack-wiring.md](recitation-timings/api-step-05-pack-wiring.md) | Pack uses Taybah rows per file; `start-web.sh` runs both imports (`--defer-pack`) before `content:ensure-packs`; spec and runbook; one Jest fixture |

Dependency order: 01 before everything; 02a is independent of the PHP steps (needs only the file format) and can run in parallel with 01; 02b needs 01; 03 needs 01 and 02b (it uses `RecitationSegmentsFlagService`); 04 needs 01 and 02b (`ResourceVersionService`, `RecitationSegmentsFlagService`, `ContentChangeRepository::deleteForResource`); 05 needs 01 to 04. All `start-web.sh` and `StartupConfigTest` edits are in 05. Start order after 05: `mp3quran:import` then `recitation-timings:import` then `content:ensure-packs`.

### Committed timings format (version 1)

One minified JSON file per recitation and surah at `apps/api/resources/recitation-timings/{kind}/{recitation_key}/{NNN}.json` (`kind` is `qf` or `mp3quran`; the key is the source's own key, so QF reciter 5 and MP3Quran moshaf 5 never collide). Written by `uv run python -m recitation_align.export` (02a), read by `recitation-timings:import` (02b). Ayah rows and segments are already mapped from Tanzil positions to QF positions with the three rules (waqf tokens dropped, basmala words dropped, a standalone vocative particle merged into the next token). The QF word-count check is **not** done in Python (it cannot reach MySQL in CI): the PHP importer checks every verse against `word_layouts` and nulls the segments of a verse whose distinct positions are not `1..N`. The file's digest is not stored in the file; the importer hashes the file bytes (plus the list of verses it nulled).

```json
{"format":1,"kind":"mp3quran","recitation_key":"253","chapter_id":59,
 "audio":{"url":"https://audio.taybah-app.com/audio/mp3quran/253/059-f0b5d093352295a0.mp3","bytes":8680138,"sha256":"f0b5d093352295a06b1e1f756e4ec815939bc07aed4753a07f82ec15351e6176","measured_duration_ms":541936},
 "source":"aligner","tool_version":"0.1.0",
 "models":{"align":{"id":"jonatasgrosman/wav2vec2-large-xlsr-53-arabic","revision":"af46c2d8531b8dcbb5e23b952f739b372c2e5d2d"},"asr":null},
 "original_first_start_ms":null,
 "ayahs":[{"verse_key":"59:1","verse_id":5127,"start_ms":0,"end_ms":14655,"segments":[[1,6427,6967],[2,7107,7728]]}]}
```

(One line in the file, every ayah and word listed; shortened here.) Ayah rows follow ADR 0060 decision 8: ayah 1 starts at 0, each ayah ends where the next starts, the last ends at the measured duration. `verse_id` is written by the converter from Tanzil line order because the API database has no `verses` table and `packages/` is not in the Docker image; the importer checks it against the `ChapterVerseCounts` constant (02b).

### Conflicts and findings for the developer

1. **Folder name (resolved, orchestrator 5 Nov 2026).** The ADR 0060 path `apps/api/resources/recitation-timings/` stands (config key `quran.recitation_timings.path`).
2. **ADR 0060 decision 5 was silent on QF row mutations (amended 5 Nov 2026).** A QF `audio_segment` mutation for a file a Taybah set owns would reach devices and overwrite the Taybah rows. Brief 03 stores the QF row (the fallback) but returns no change, so no version bump and no change feed entry. ADR 0060 now carries the amendment.
3. **Latent bug, fixed in 04.** `ContentDeliveryService::isDefault()` compares only `source_key` with `quran.default_recitation` (a QF id). An MP3Quran moshaf with the same number would be flagged default in the manifest. The fix requires source `qf`; one existing test helper changes.
4. **No `verses` or `chapters` table in the API database.** The importer maps `verse_key` to `verse_id` and checks ayah counts with a 114-entry constant (`ChapterVerseCounts`), tested against the Tanzil file; `TanzilReader`'s `../../packages` path does not exist on Railway.
5. **`content_sources` attribution columns are NOT NULL.** The migration in 04 writes the neutral `MP3Quran (mp3quran.net)` in both languages until the developer's wording is approved (plan B2/B3); a later migration replaces it.
6. **Local pilot rows are in `recitation_timings`,** not in the Taybah tables. Brief 04 deletes them (an MP3Quran recitation must own none) and converges resource 56 and recitation 22 in place (one bump, v4 to v5); the Taybah import then refills them. Fallback SQL is in the brief.
7. **ADR 0044 health-check budget.** Bumping many recitations in one deploy builds all their packs before the 120 s health check; both imports run with `--defer-pack` so each pack is built once, at its final version.
8. **Case-insensitive URL join** in the pack query (accepted residual, 01 and 05).
9. **Spec §12 still says the player keeps a speed control;** ADR 0062 removed it. Not touched here.

### Open questions carried in the briefs (defaults given)

Skip (default) versus null-segments when `word_layouts` is empty; neutral attribution text; style from `moshaf_name` through `quran.mp3quran_styles`; duplicates imported inactive (default) versus not imported, with `quran.mp3quran_duplicates` starting empty; a committed file that disappears does not delete its stored set (default).

## A9. Repeated words (developer, 4 Nov 2026)

When a reciter goes back and repeats words, the highlight jumps back to the repeated word and continues, as QF's data already does (Mishary al-Afasy 2:14: positions 1–11 then 7–11 again). The device needs no change: `timingsFor` sorts segments by time and allows a position to appear twice. Only the aligner changes, because CTC forced alignment is strictly monotonic over the text.

1. **Measure first.** On Islam Sobhi's 109 aligned surahs, flag suspect ayahs (audio span ≥ 1.5× the expected duration from the reciter's own words-per-second, or mean word confidence < 0.5) and report the count.
2. **Recited order.** For each suspect ayah, run the Tarteel ASR on that ayah's audio span only; map the transcript to Tanzil word positions with a sequence alignment that allows backward jumps (normalised keys, `text.py`), giving e.g. 1…11, 7…11, 12….
3. **Align that order** inside the ayah's time span with the existing forced aligner; output segments with repeated positions in the same shape as QF's.
4. **Fall back** to the monotonic timings when the mapping is not confident (unmatched words above a threshold, or the expanded order does not cover every position).
5. **Re-run only flagged ayahs**; no full re-alignment. Tests: synthetic repeat recovered; no-repeat ayah unchanged; low-confidence mapping falls back.

Runs after the 109-surah alignment; does not block the B5 import.
