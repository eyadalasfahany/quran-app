# Plan: Tanzil word segmentation aligned to Quran Foundation word positions

## Goal
Build per-word Quran text (Uthmani, then Imla'i) whose word positions exactly match the Quran Foundation (QF) / quran.com v4 numbering (`word_id`, `position_in_verse`). Our recitation audio word-timing segments are keyed by word position, so any mismatch breaks audio word highlighting.

We are NOT requesting `quran_core` access from QF, and we must NOT build offline packs from the public QF v4 API (QF terms forbid this). All text comes from openly licensed sources.

Background research: [Replacing QF quran_core: open Quran text and word-segmentation sources](https://cursor.com/canvas/store-b3a3dc43-8e25-482e-9a7f-1603ddabcea2/726d1e67-1706-4738-b440-18251717c451)

## Inputs
1. **QF layout export (ground truth for positions)**: the synced mushaf layout rows with `word_id`, `verse_id`, `position_in_verse`, `page`, `line` (plus `char_type` if present). Format: CSV or SQLite. Provided separately by Eyad.
2. **Tanzil Uthmani v1.1**: already bundled in the app (CC BY 3.0, verbatim only).
3. **Tanzil Simple** (Imla'i): from https://tanzil.net/download/ (same licence).
4. **Tanzil quran-data.xml**: already bundled, for verse keys and counts (6,236 verses).

## Hard rules
- Never modify Tanzil text: no Unicode normalisation, no tatweel removal, no code point substitution. Only split it, and attach marks to neighbouring words.
- Ship the Tanzil licence notice with every data pack (see https://tanzil.net/docs/text_license).
- Do not download data from QUL (Tarteel) for shipping. Its licence is unclear. It may be consulted manually for spot checks only.
- Do not use quran.com / QF public API v4 output as a data source for packs.

## Steps

### 1. Load both sides
- Parse the QF layout export into `qf_words(verse_key, position_in_verse, word_id, char_type)`.
- Parse Tanzil Uthmani v1.1 into `tanzil_verses(verse_key, text)` with text kept byte-for-byte.
- Sanity check: 6,236 verses on both sides.

### 2. Split Tanzil Uthmani into words
For each verse:
1. Split on ASCII space (U+0020).
2. Any token that is only a stand-alone pause/waqf mark (for example U+06D6 to U+06DC, U+06E2, U+06ED and similar small high marks appearing alone) is attached to the PREVIOUS word, not counted as a word.
3. `۞` (U+06DE, rub el hizb) at the start of a verse is attached to the FOLLOWING word. `۩` (U+06E9, sajdah) is attached to the PREVIOUS word.
4. Append one synthetic `end` row per verse (verse-end marker), matching QF's `char_type = end`.
5. Output `tanzil_words(verse_key, position, text_uthmani, char_type)` with positions starting at 1.

Verified so far on 1:1, 2:255, 112:1, 2:26, 7:206 and 20:94 only. Steps 3 to 5 exist to validate it across all verses.

### 3. Compare counts for all 6,236 verses
For each verse: `count(tanzil_words incl. end) == max(qf position_in_verse)`.
Also compare `char_type` per position where QF has it (word vs end; pause marks if QF emits them as separate rows. If it does, adjust rule 2.2 to emit them as their own rows instead of attaching).

### 4. Report mismatches
For each mismatching verse, output both word lists side by side (Tanzil tokens vs QF positions/char types). Group mismatches by cause, for example:
- joined words in one source but split in the other
- separate particles or prefixes
- pause-mark handling
- rub el hizb / sajdah handling
- anything else

### 5. Fix rules and iterate
- Turn each recurring cause into a general split rule.
- Put true one-offs (for example 20:94) in an explicit exception list: `exceptions.json` with `verse_key`, and the exact token split to use.
- Rerun until 100% of verses match on count and char_type.

### 6. Align Imla'i (Tanzil Simple)
- Do NOT split Tanzil Simple independently on spaces.
- Align Simple words onto the final Uthmani word split, position by position, per verse.
- Flag any verse where the Simple token count differs from the Uthmani word count (excluding the end row). Resolve with alignment rules or exceptions, as in step 5.
- Output `text_imlaei` per position.

### 7. Deliverables
1. `word_map` table (CSV + SQLite): `verse_key, position, word_id, char_type, text_uthmani, text_imlaei`.
2. `exceptions.json` with the reason for each entry.
3. `report.md`: total verses, pass/fail counts, mismatch groups before and after fixes, final status.
4. A rerunnable script (PHP for the Laravel pipeline, or a standalone script plus an artisan command wrapper) that rebuilds everything from the inputs and fails loudly on any mismatch.
5. Checksums (SHA-256) of the input files and the output pack, stored alongside the pack.

## Acceptance criteria
- 6,236 of 6,236 verses match QF word counts and char types.
- Every `word_id` in the QF export maps to exactly one row in `word_map`.
- Tanzil text in the output is byte-identical to the source once rows are joined back per verse (verify by reconstructing each verse and comparing to the source).
- The Tanzil licence notice is included in the pack.

## Later (out of scope for this task)
- IndoPak per-word text from DigitalKhatt (MIT licence): run the same alignment and check.
- Tajweed: no clean per-word source with a clear licence yet. AlQuran Cloud tajweed markup has unclear ownership and colour spans that cross word boundaries. Treat it as an open item.
