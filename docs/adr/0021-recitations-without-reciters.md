# 0021 — Recitations without a reciters table

Date: 2026-10-29 · Status: accepted · Amends spec §5, §6 and §9

## Context

Spec §5 drew a `reciters` table (`source_key`, `name_ar`, `name_en`, `style`, `is_active`, `sort_order`) and a `recitations` table pointing at it through `reciter_id`, with a `riwayah` column. Spec §9 listed `GET /reciters` and `GET /reciters/{id}/chapters/{chapter}`.

QF's Content Sync has no reciter entity. Its `chapter_recitations` group has one resource per recitation, and the catalogue (`/resources/chapter_reciters`) gives each one a name, a style and a qirat. Phase 1 (step 4) built the mirror from that data: `recitations` has one row per `chapter_recitations` resource and carries `reciter_name`, `reciter_name_ar`, `style` and `qirat` itself. No `reciters` table was ever created, on the API or on the device. Reciters reach the device through the content manifest and the recitation packs, so the two `/reciters` endpoints were never built (Phase 3 plan: "No extra endpoint is needed"). Phase 3 step 1 found the difference between the spec and the code (29 Oct 2026).

## Decision

1. **No `reciters` table.** `recitations` is the one audio identity table: `id`, `resource_id` (unique), `reciter_name`, `reciter_name_ar`, `style`, `qirat`, `has_word_segments`. The device mirrors it unchanged.
2. **No `riwayah` column.** QF's `qirat` name fills that role.
3. **No `/reciters` endpoints.** The app lists reciters from `catalog_resources` (group `chapter_recitations`) and reads files and timings from installed recitation packs.
4. **Timing ranges are checked on the device.** MySQL has no check constraint on `start_ms < end_ms`. The app drops a file's timings when any range is empty or two ranges overlap, and plays it without highlight (spec §12).

The spec is updated to the code in the same change.

## Consequences

- One reciter with two styles (murattal and mujawwad) is two recitations, listed separately. Grouping them in the UI would need a key that QF does not send.
- Playing a reciter needs its recitation pack installed, because the audio URLs are in the pack. The pack holds no audio, only URLs and timings, so it is small.
- The default reciter (Phase 3 D2) is chosen by QF source id, because the device has no stable reciter key of its own.
