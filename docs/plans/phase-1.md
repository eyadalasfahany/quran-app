# Phase 1 — Content pipeline

Spec §15. Exit criterion: a fresh install reaches QF text offline, and the checksum passes.

Same rules as Phase 0:
- Each step is one reviewable change.
- After each step, the checks for every app it touched run, and their real output is shown. A check that can't run is reported as N/A, never as passed.
- The developer reviews and commits before the next step starts.
- CI is paused (phase-0 step 10), so these local checks are the only gate.
- An endpoint step ships its `openapi.json` and TS types in the same change.

## What QF prelive actually gives us (probed 27 Oct 2026)

Calls made with our prelive keys.

**Content Sync** (`GET /content/api/v4/resources/sync`):
- **Request:**
  - `resources` is required, as `group:id` pairs separated by `;`. `group:*` means every resource in the group.
  - Responses page with `has_more` and `next_page_url`. The page URL is relative (`/api/v4/…`), so prefix the environment's `…/content`.
- **Response:** `{ "sync": { sync_until_sequence, has_more, next_page_url, next_sync_token, mutations[] } }`.
- **Mutation fields:** `sequence`, `type`, `resource_group`, `resource_id`, `resource_content_id`, `record_type`, `record_key`, `source_record_id`, `changed_at`, `data`, `snapshot_url`, `unavailable_reason`.

**Snapshots** (`GET /resources/snapshots/{group}/{id}`):
- **Shape:** `{ resource_group, resource_id, resource_content_id, schema_version, sync_sequence, records[] }`.
- **Records are flat.** Mushaf records carry a `record_type` (`mushaf`, `mushaf_page`, `mushaf_word`); translation and tafsir records have none.

**What this client can see on prelive:**

| Group | Resources | Data |
| --- | --- | --- |
| `quran_core` | **none** | — |
| `mushafs` | 13 (QCF V2 = 1 …) | Pages and word positions for the 2 sample surahs. `mushaf_word.text` is a QCF glyph code, not Unicode text |
| `translations` | 14 | 293 ayahs (Al-Fatihah + Al-Baqarah) |
| `tafsirs` | 7 | 293 rows, one per ayah, grouped by `group_tafsir_id` and `start_verse_id`/`end_verse_id` |
| `word_by_word_translations` / `_transliterations` | 1 / 0 | — |
| `recitations` (per ayah) | 2 | All 6,236 ayahs, with verse metadata (juz, hizb, rub, manzil, page) |
| `chapter_recitations` | 100+ (paged) | All 114 surahs, 6,236 timing segments with word-level timings |

**Verse text is not in Content Sync for us.** The regular Content API (`/verses`) returns it for the two sample surahs, but the content plan allows offline QF text only through Content Sync. So the plan neither copies `/verses` into the mirror nor rebuilds verses from the metadata inside translation or recitation records.

## Decisions (answered 27 Oct 2026, ADR 0008)

- **D1:** no contact with QF. Step 9 stays gated unless a permission can be requested in the Developer Console.
- **D2:** use QF's group names.
- **D3:** play the audio URLs QF returns, whatever the host.
- **D4:** gzipped packs, decompressed on the device with `fflate` 0.8.3.
- **D5:** contact email in `QF_CONTACT_EMAIL` (`.env`, not committed).

The original questions:

| # | Question | Blocks |
| --- | --- | --- |
| D1 | **`quran_core` access.** Is there a Content Sync or `quran_core` permission to request in the Developer Console? If not, ask QF (spec §16) | Step 9 and the "QF text offline" exit check |
| D2 | **Resource groups.** QF has `word_by_word_translations`, `word_by_word_transliterations`, `recitations` (per ayah), `chapter_recitations` and `articles`; spec §5's `resources.group` enum has `word_by_word` and `chapter_recitations`. Proposal: use QF's names, and leave `articles` out | Step 2 |
| D3 | **Audio host.** `chapter_audio_file.audio_url` points at `download.quranicaudio.com`, and per-ayah `url`s are relative with no base given. Non-negotiable #2 says the app calls only our API and the QF audio CDN, and the content plan says QuranicAudio is "not used directly". Is that host QF's CDN for our purposes? (Ask QF if unsure) | Audio parts of steps 4 and 6 |
| D4 | **Pack compression on the device.** Packs are gzipped SQLite, and nothing in the version table gunzips on the device. Options: (a) add a small gunzip library (needs a version-table entry and a release in the last 12 months), (b) serve plain `.sqlite` and rely on HTTP compression (Caddy and Cloudflare), (c) zip through a native module. Proposal: **(b)**, simplest, and the transfer is still compressed | Steps 6 and 8 |
| D5 | **User-Agent contact email** for QF requests (spec §3). Which address? | Step 1 |

Also folded into the steps (no decision needed):
- Tafsir ingest dedupes on `group_tafsir_id`, so a tafsir row covers its whole verse range (spec §5).
- Timing durations are derived from `timestamp_from`/`timestamp_to`, because QF's `duration_ms` field is unreliable (`6` next to `duration: 6300`).
- The two segment formats are normalized: `[word, start, end]` (chapter) and `[idx, word, start, end]` (per ayah).

## Steps

### 1. QF client and config — API

- **Creates:**
  - `config/quran.php`: environment (`QF_ENV`), the auth and API hosts per environment (content plan), timeouts, retry, and the User-Agent with the contact email (D5).
  - `Integrations/QuranFoundation`:
    - `OAuthTokenProvider`: client credentials, `scope=content`, cached in Redis until 60 s before expiry.
    - `ContentSyncClient`: `sync()` with paging, `snapshot()`, and relative-URL resolution.
    - Retry with backoff, and `Retry-After` honoured on 429.
- **Tests:** `Http::fake` only.
  - The token is cached and refreshed.
  - Paging follows `next_page_url`.
  - Relative URLs resolve per environment.
  - A 429 retries.
  - Prelive and production never mix (a token from one is never sent to the other).
- **Verify:** `composer qa`. Plus one manual live call against prelive (`php artisan qf:ping`), printing only status codes and counts.

### 2. Mirror schema, first part — API (needs D2)

- **Creates:** migrations and models for the tables we can fill now (spec §5):
  - Sync state: `content_sources`, `resources`, `sync_states`, `sync_runs`, `content_changes`, `content_packs`.
  - `translation_entries`, `tafsir_entries`.
  - `mushafs`, `mushaf_pages`, `word_layouts`. `word_layouts.word_id` is not a foreign key until `words` exists (step 9).
  - `reciters`, `recitations`, `chapter_audio_files`, `recitation_timings`.
- **Not yet:** `chapters`, `verses`, `words` (step 9).
- **Encoding:** text columns use `utf8mb4_0900_bin`, stored byte for byte.
- **Seeder:** `content_sources` rows for QF and Tanzil, with licence and attribution.
- **Tests:**
  - The migrations run on MySQL.
  - Byte-exact round trip of a QF string with every diacritic form.
  - The arch rules still hold.
- **Verify:** `composer qa`; `php artisan migrate` on the local database.

### 3. Sync engine on translations — API

- **Creates:**
  - `Domains/Content` `SyncService` and `SyncQuranFoundationJob`. Spec §7 hop 1 (steps 2–4):
    1. Bootstrap per group.
    2. Fetch every `snapshot_url` and replace that resource's rows in one transaction.
    3. Store `next_sync_token` only after the final page.
    4. Apply mutations in ascending `sequence`, each in its own transaction with `last_sequence`.
    5. Bump `resources.version` once per run.
    6. Write `content_changes` rows.
  - Handlers per group: `translations` first.
- **Fixtures:** hand-trimmed from real prelive responses. A few records per `record_type`, never the full 0.2–3.9 MB snapshots. Saved under `tests/Fixtures/qf/`.
- **Tests** (spec §11 style):
  - A fresh bootstrap fills the rows.
  - A rerun with the token is a no-op.
  - A crash mid-run resumes at `last_sequence`.
  - `ROW_UPDATE` and `ROW_DELETE` apply.
  - `RESOURCE_INVALIDATE` replaces all rows.
  - `RESOURCE_DELETE` deactivates the resource.
  - Text is unchanged byte for byte.
- **Verify:** `composer qa`, then one live prelive run for translation 85: 293 rows, checked with a query.

### 4. Remaining groups we can reach — API (audio parts need D3)

- **Handlers:**
  - `tafsirs`: deduped on `group_tafsir_id`; HTML sanitized to the content-plan whitelist; `source_hash` kept.
  - `mushafs`: pages and word layouts.
  - `chapter_recitations` and `recitations`: timings normalized. Audio URLs are stored as received until D3 is answered.
- **Tests:**
  - Paging on `chapter_recitations` (its bootstrap returns `has_more: true`).
  - Tafsir grouping and sanitizer cases.
  - Segment normalization for both formats.
- **Verify:** `composer qa`; a live prelive run whose counts match the probe table above.

### 5. Text integrity: `packages/quran-text-check` and the Tanzil seed — Both

- **Tanzil:**
  - Download the Uthmani text (CC BY 3.0, verbatim) once.
  - Pin its SHA-256 in the repo.
  - Store the file unchanged under `packages/quran-text-check/data/`, with the licence and credit.
- **The package:**
  - `checksum(script, ayahs)`: SHA-256 over the 6,236 ayahs in `verse_id` order, joined with `\n`.
  - `verifyTanzil()` checks 6,236 ayahs, the per-surah counts, and the pinned hash.
  - The stub that throws is replaced.
- **One checksum per source.** Tanzil and QF encodings differ (content-plan risk row), so they are never compared with each other.
- **API side:**
  - `VerifyTextIntegrityJob` shape and the "unpublishable version" flag.
  - Wired for `quran_core` in step 9.
- **Verify:** package tests (6,236 ayahs, 114 surahs, the hash matches, a single changed byte fails); `composer qa`.

### 6. Packs, manifest, change feed — API + contract (needs D4)

- **Builds:** `BuildContentPackJob` writes a per-resource SQLite file in the spec §6 `content.db` shape and records its size and SHA-256.
- **Endpoints:**
  - `GET /content/manifest`, with `ETag` and 304.
  - `GET /content/packs/{resource}/{version}`.
  - `GET /content/changes`, with a cursor and `410` past 30 days.
  - API Resources, `Cache-Control` per spec §8, rate limit 300/min.
- **Tests:**
  - Manifest 200 and 304.
  - Pack hash and size.
  - Changes: paging, and 410.
  - An older version stays live after a failed build.
- **Verify:** `composer qa`; `npm run generate -w @quran/api-contract` with the result committed; mobile `tsc`.

### 7. Device database — App

- **Packages:** `expo-sqlite` and Drizzle at the version-table pins (`npx expo install` for `expo-sqlite`).
- **`content.db`:** schema and migrations from spec §6, opened in WAL mode.
- **Seed:** the bundled seed holds the Tanzil verses and chapter metadata, with `meta.bundled_text` set. The seed is generated from step 5's pinned file by a script, never edited by hand.
- **`user.db`:** the empty schema only. Sync is Phase 4.
- **Tests:**
  - The seed has 6,236 ayahs.
  - `quran-text-check` passes on the seed's own text.
  - Migrations run on a fresh database.
- **Verify:** mobile checks. Plus, on a simulator, the app opens offline and can query `2:255` from the seed.

### 8. Device content sync — App

- **`core/sync/content-sync.ts`** (spec §7 hop 3):
  1. Fetch the manifest with `If-None-Match`.
  2. Download a pack, check its SHA-256, `ATTACH` it, copy the rows in one transaction, then detach.
  3. Fetch the change feed, falling back to the full pack on 410.
  4. Record `installed_resources.last_checked_at`.
  - Runs at start and on returning to the foreground after 6 h.
  - Typed from `@quran/api-contract`.
- **Tests:**
  - A pack import is atomic (a failure in the middle leaves the old rows).
  - A hash mismatch discards the pack.
  - 304 does nothing.
  - 410 downloads the pack.
- **Verify:** mobile checks, then a live run against the local API: translation 85 lands on the device, offline afterwards, on 2 surahs.

### 9. `quran_core` — API + App (blocked on D1)

- **API:**
  - The handler for chapters, verses and words. Fixtures are recorded from a real `quran_core` response, so no handler code is written before access exists.
  - `text_search` is derived on ingest, while the source columns stay byte-exact.
  - `VerifyTextIntegrityJob` is wired in.
  - `word_layouts.word_id` becomes a foreign key.
- **App:**
  - `quran_core` pack import replaces the Tanzil rows and clears `meta.bundled_text`.
  - The on-device checksum is compared with the manifest's `sha256_text`.
- **Verify:** composer and mobile checks; a live run on whatever prelive exposes.

### 10. Exit check — Both

| Part | Status |
| --- | --- |
| Fresh install offline → Tanzil text from the seed, checksum passes | Reachable after step 7 |
| Backend → pack → device for translations, tafsirs, mushaf layouts and timings, on 2 surahs | Reachable after step 8 |
| **Fresh install reaches QF text offline** | Needs D1 (step 9) |
| **QF checksum over 6,236 ayahs** | Needs production access, or a full prelive dataset (asked of QF, spec §16) |

- If D1 or production access is still pending at the end of step 8, Phase 1 closes **partially**, with the blocked rows recorded here.
- Phase 2 (the reader) can start on the Tanzil seed. Its reader code reads `content.db`, so the source switch in step 9 doesn't change it.

## Not in Phase 1

- Hadith, articles, word-by-word UI and search UI.
- Production keys and the 5-day sync-age alert, which wait for a staging server.
- User data sync (Phase 4).
