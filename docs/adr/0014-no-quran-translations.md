# 0014 — No Quran translations or word meanings

Date: 2026-10-28 · Status: accepted · Amends ADR 0008 (content groups), ADR 0013 §2 (kept features), spec §5, §6, §7, §9, §12 and §15, the content plan

## Context

The app was planned to sync Quran translations and word-by-word meanings from Quran Foundation, store them in MySQL and `content.db`, and show them under each ayah in Reading mode, in a translation panel and tile, in reader settings and as word chips in the ayah sheet. Phase 1 built the sync, the packs and the device tables. Phase 2 built the reader UI.

The developer decided on 28 Oct 2026 that Taybah will not have translations.

## Decision

1. **No Quran translations and no word-by-word meanings or transliterations**, anywhere: API, MySQL, packs, the change feed, `content.db`, the reader, the design files and the docs.
2. The API ignores QF's `translations`, `word_by_word_translations` and `word_by_word_transliterations` groups. It does not sync, store, pack or list them. The tables and rows already written are dropped by a migration.
3. `content.db` drops `translation_entries` in a new migration. The device never asks for a translation pack. Reader settings lose `translationIds`.
4. The reader shows the Arabic text only. The translation tab, panel, tile, settings section, translation lines under ayahs and the word chips are removed, and their frames are removed from `quran-app-screens.html` and `quran-app-design-system.html`.
5. **The English interface stays.** It is localisation of the app's UI, not a translation of the Quran.
6. Tafsir stays as it is.

## Consequences

- Smaller packs, one less sync group, and simpler reading rows (one Quran text per ayah; row height depends only on width and font scale).
- The ayah sheet has seven action tiles (play, tafsir, bookmark, repeat, note, copy, share).
- Search over translations goes; tafsir search stays as planned.
- **Hadith keeps its translations** (a later phase). The Arabic hadith is always shown, in every interface language. When the interface is English, the English translation sits under the Arabic.
