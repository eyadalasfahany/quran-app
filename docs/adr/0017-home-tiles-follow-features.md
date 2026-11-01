# 0017 — Home tiles follow shipped features

Date: 2026-10-28 · Status: accepted · Amends `quran-app-screens.html` #Main (and the expanded Home) for v1

## Context

The Home frame has a row of four tiles: السور, الحديث, المحفوظات, القرّاء. Hadith is cut to v1.1 (spec §15) and the reciters list lands in Phase 3 step 6. A tile that opens an empty or missing screen is a dead end.

The design system gives My Quran and Saved the `bookmark` glyph and keeps `pencil` for editing only, but the مصحفي tab used `pencil` / `edit`.

## Decision

1. Home shows only the tiles whose feature has shipped. Now: السور (opens the Mushaf tab's surah index) and المحفوظات (opens مصحفي).
2. القرّاء is added in Phase 3 step 6, with the reciters screen. الحديث is added with the v1.1 hadith section, which comes after listening.
3. The tiles share the row equally (each `flex: 1`). With all four they match the frame's four columns; with fewer, each is wider.
4. The مصحفي tab uses `bookmark` (Android `bookmark`), the same glyph as the المحفوظات tile.
5. The السور glyph (`list.bullet`) uses the system's RTL variant, with the bullets on the right, per the HIG ("flip interface icons that represent text or reading direction"). The Arabic Home frames (#Main, HomeDark, HomeAndroid, and the expanded Home) now draw it that way; HomeEnglish keeps the bullets on the left.
6. The tile label is 13 px at a 19 line pitch: the frame sets no line-height, and 13 px Plex at `normal` gives 19 (as `focusLabelLineHeight` records).

## Consequences

- Until all four tiles ship, Home differs from #Main in the tile row only. Reviews accept the shorter row and wider tiles.
- Each feature step that adds a tile also adds it to the tile list and its tests.
- The same rule covers the rest of Home (developer, 29 Oct 2026): the «وِردك اليوم» subtitle and the khatma card come with khatma in Phase 4, and «آخر ما استمعت إليه» with the players in Phase 3 step 4.

Amended by ADR 0042 (1 Nov 2026): the الحديث tile ships with the Hadith collections in Phase 7 and shows only while at least one collection pack is installed.
