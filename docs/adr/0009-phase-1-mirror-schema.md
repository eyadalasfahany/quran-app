# 0009 — Phase 1 mirror and device schema follow QF's real data

Date: 2026-10-27 · Status: accepted · Amends spec §5 and §6

## Context

Spec §5 and §6 were written before we could call QF. Probing prelive (see `docs/plans/phase-1.md`) showed four things:
- **Snapshot record fields:** they differ from the spec's columns. Mushaf words carry a QCF glyph code plus line and position. Mushaf pages carry verse ranges. Tafsir rows come one per ayah, with a group id.
- **Resource metadata:** name, author and language come from catalogue endpoints, not from Sync.
- **Recitations:** one chapter-recitation resource is exactly one recitation. There's no separate reciter entity we can sync.
- **No `quran_core`:** we have none, so `chapters`, `verses` and `words` can't be filled from QF yet.

## Decision

**Backend (spec §5).** The tables are as listed in `docs/plans/phase-1/step-02-mirror-schema.md`:
- **`resources`:**
  - Adds `source_content_id`, `language_name`, `changes_floor_version`, `source_sequence` and `unavailable_reason`.
  - `name`, `language_code` and `direction` become nullable.
  - `changes_floor_version` drives the change feed's `410` and the manifest's `changes_since_min_version`.
- **`sync_states`:** adds `resources_filter`.
- **New `mushaf_pages`:** the page → verse and word ranges.
- **`word_layouts`:**
  - Adds `verse_id`, `position_in_verse`, `char_type`, `glyph` (bin), `position_in_line`.
  - So a mushaf page renders from its layout alone.
- **`tafsir_entries`:** adds `group_tafsir_id` (unique per resource) and the first and last verse keys.
- **Recitations:**
  - `reciters` is dropped for Phase 1.
  - `recitations` holds the reciter's names, style and qirat directly, one row per `chapter_recitations` resource.
  - A `reciters` grouping can come back in Phase 3, if the UI needs it.
- **Not yet:** `chapters`, `verses` and `words` (and the foreign keys to them) wait for `quran_core` (Phase 1 step 9).
- **Not synced in Phase 1:** the per-ayah `recitations` group.

**Device (spec §6):**
- **The Tanzil seed** is a separate bundled SQLite asset (`tanzil-seed.db`), attached and copied into `content.db` on first launch, the same way packs are. `content.db` itself is always created by migrations.
- **Verse text columns:** `text_imlaei` and the other scripts are nullable, since Tanzil supplies only Uthmani.
- **Packs and the device share** the table and column contract in `docs/plans/phase-1/README.md`.
- **`user.db` moves to Phase 4,** with the sync engine.

## Consequences

- **The column-level source of truth for Phase 1** is the step briefs. Spec §5 and §6 point to them for the Phase 1 tables.
- **Step 9 revisits** `chapters`, `verses` and `words` from a real `quran_core` response.
