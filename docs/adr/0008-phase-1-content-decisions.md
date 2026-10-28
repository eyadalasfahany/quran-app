# 0008 — Phase 1 content decisions: QF access, resource groups, audio hosts, packs

Date: 2026-10-27 · Status: accepted · Amends spec §5, §7 and §16, the content plan, and root CLAUDE.md non-negotiable #2

Amended by ADR 0014.

## Context

Before planning Phase 1, we probed QF prelive with our keys (`docs/plans/phase-1.md`, "What QF prelive actually gives us"):

- Content Sync's `quran_core` group returns no resources for our client, so verse text is not available through Sync.
- The other groups are reachable. `mushafs`, `translations` and `tafsirs` cover the two sample surahs; recitation timings are complete.
- QF's real group names differ from spec §5.
- Recitation audio URLs point at `download.quranicaudio.com` (per surah) or are relative paths (per ayah).
- Packs are gzipped SQLite, but nothing in the version table could gunzip them on the device.

## Decision

1. **No contact with QF for now** (the developer's decision). The spec §16 questions to QF are not being sent.
   - `quran_core` stays blocked unless a permission can be requested in the Developer Console.
   - Phase 1 step 9 is gated. If it is still blocked when step 8 finishes, Phase 1 closes partially.
   - The bundled Tanzil text stays the device's Quran text until then.
2. **Resource groups follow QF's names:** `quran_core`, `mushafs`, `translations`, `tafsirs`, `word_by_word_translations`, `word_by_word_transliterations`, `recitations`, `chapter_recitations`, plus our own `hadith`. QF's `articles` group is not synced.
3. **Audio:** the app plays the audio URLs that QF's API returns, whatever host they point at (today `download.quranicaudio.com`), under QF's terms. These count as the "QF audio CDN" in non-negotiable #2.
   - Relative per-ayah URLs are resolved against the base QF's API documents. They are stored as received until that base is known.
   - The app still never calls QuranicAudio's own catalogue or API.
4. **Packs are gzipped SQLite, decompressed on the device with `fflate` 0.8.3**, chosen for performance:
   - Gzip makes SQLite text 3–4× smaller.
   - CDNs usually don't compress binary content types, so relying on HTTP compression would send packs uncompressed.
   - `fflate` is the fastest pure-JS gunzip, small, with no native module (released July 2026).
5. **Contact for QF requests:** `QF_CONTACT_EMAIL` in `apps/api/.env`. It goes into the User-Agent and is not committed.

## Consequences

- **Accepted risks** (spec §16):
  - Without asking QF, we have no confirmation that devices may sync their offline copy from our backend mirror.
  - The offline and audio retention rules stay our reading of the Developer Terms.
  - If QF objects later, `content-sync.ts` stays behind one interface, so the source can change.
- **The QF checksum and "fresh install reaches QF text offline"** remain unreachable until `quran_core` access exists.
- **`fflate` added** to the content-plan version table, in `apps/mobile`.
