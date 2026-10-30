# 0029 — Play glyph stays fixed in every language

Date: 2026-10-30 · Status: accepted · Supersedes ADR 0025 (decision 1)

## Context

ADR 0025, accepted earlier the same day, made the play glyph mirror with the layout direction so it points left in Arabic. On device the developer judged the flipped triangle wrong: play maps to the timeline of the audio, not to the reading direction, and the HIG keeps media playback glyphs unmirrored in RTL locales. The developer asked for the flip to be removed everywhere (30 Oct 2026).

## Decision

1. **Play never flips.** Every play and pause glyph keeps one orientation in Arabic and English: the triangle points right. This covers the full player, the tabs, sidebar and reader mini bars, Focus, the ayah row and the ayah actions, the Listen rows and Home's recent listens — the same list ADR 0025 used.
2. **The rest of ADR 0025 stands.** A play control whose audio is playing shows pause (decision 2), and progress, times and the previous and next ayah controls still mirror with the layout direction.

## Consequences

- ADR 0012's "play and pause glyphs never flip" holds again for the play glyph; previous and next glyphs still flip.
- The exit checks that asserted a left-pointing play in Arabic (phase 2 step 10, phase 3 step 8) now assert a fixed right-pointing play in both languages.
- `player-icons.ts` documents the rule: play and pause map to the timeline, not the reading direction.
