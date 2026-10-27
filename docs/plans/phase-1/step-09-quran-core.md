# Step 9 — `quran_core` (API + App): BLOCKED

**Do not implement this step yet.** As of 27 Oct 2026, our QF client gets no `quran_core` resources from Content Sync (`resources=quran_core:*` returns zero mutations). The developer decided not to contact QF (ADR 0008).

**It unblocks when** a `quran_core` (or Content Sync) permission is granted in the QF Developer Console, and `quran_core:*` bootstrap returns at least one `RESOURCE_CREATE`.

## What the step will contain once unblocked

The final brief is written then, from a recorded real response, never from guesses.

- **API:**
  - Migrations for `chapters`, `verses` and `words` (spec §5).
  - Foreign keys from `translation_entries`, `tafsir_entries`, `word_layouts` and `recitation_timings` to them.
  - A `QuranCoreHandler` on the step 3 engine, storing text columns byte for byte.
  - `text_search` derived with a PHP `App\Support\ArabicNormalizer`, matching `normalizeForSearch` from step 7 (a parity test on shared vectors).
- **API, integrity:**
  - `VerifyTextIntegrityJob`: SHA-256 per script over the ayahs in `verse_id` order (`AyahChecksum` from step 5) is stored on the resource, and a mismatch with the source checksum marks the version unpublishable.
  - The manifest's `sha256_text`.
- **Packs:** `quran_core` packs include chapters, verses and words, plus the default mushaf's layouts.
- **App:**
  - Importing the `quran_core` pack replaces the Tanzil `chapters`/`verses` rows and clears `meta.bundled_text`.
  - The on-device checksum is compared with the manifest's `sha256_text`; a mismatch discards the update.
  - The code path to purge QF rows and fall back to Tanzil sits behind a remote flag (spec §7, hop 3, item 6).
- **Exit:** a fresh install reaches QF text offline, and the checksum passes on the full dataset (needs production access, or a full prelive dataset).

## Before writing the real brief

Record trimmed fixtures from a real `quran_core` bootstrap and snapshot: a few records per `record_type`, never bulk.
