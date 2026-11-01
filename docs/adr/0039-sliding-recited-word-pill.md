# 0039 — The recited word is a sliding pill in Reading and Focus

Date: 2026-11-01 · Status: accepted (developer, 1 Nov 2026) · Amends spec §12 (Word highlight) and the motion table (word highlight row). ADR 0012 (the recited ayah's wash and rule) is unchanged. Mushaf is unchanged.

## Context

While audio plays, the recited word is marked by a background span on its own nested `Text`. A span's background cannot animate its position, so the mark jumps from word to word. The developer asked for the mark to slide to the next word on the same line.

React Native reports lines from `onTextLayout` (each with its x, y, width, height, ascender, descender and text), but not the rectangle of each word. The word boxes have to be computed.

## Decision

1. **Scope.** The sliding pill is used in Reading and Focus only. The Mushaf page (`HafsMushafPage`) keeps the span highlight. Its recited ayah has an opaque `highlightActive` wash, and its justified lines are harder to measure. Revisit after an on-device accuracy check.
2. **The Quran text is unchanged.** The ayah stays one `Text`, byte for byte (non-negotiable 1). The pill is a separate view drawn behind it, and the recited word's span loses its background and keeps only the light ink.
3. **Word boxes from measurements.** Each token's natural width is measured once per ayah with hidden `Text`s (one per token, same variant and font scale), cached under the key of text, variant and font scale. The `Text`'s `onTextLayout` lines place each token: on each line the first token sits at the right edge (Quran text runs right to left), and the line's leftover width is shared equally between the gaps. The pill is the glyph box (ascender plus the absolute descender) centred in the line, padded by `space[1]` sideways and `space[1] / 2` vertically, and never taller than the line.
4. **Slide on the same line, jump otherwise.** When the next recited word is on the same line, the pill slides (translateX and width) with `timing('fast')`, not a spring: a 350 ms spring falls behind the recitation, and more so at 2×. A new line or a new ayah jumps. Under Reduce Motion everything jumps.
5. **Text colour follows arrival.** The recited word keeps the ink colour while the pill travels, and turns to `onBrandSurface` when the pill arrives. A jump turns it at once.
6. **Fallback.** Until the widths and lines of the ayah are known, the recited word keeps the span marking, so the word is never unmarked.
7. **Rounded pill.** The frame draws a tight span box. The pill is rounded (`brandSurface`, radius `sm`). The developer approved this difference (1 Nov 2026).

## Consequences

- Each new ayah mounts one hidden `Text` per token while its widths are measured. The probe is unmounted once every width is known, and it is hidden from accessibility.
- The positions are estimates. A hidden `Text` measures a word on its own, so shaping and justification can differ slightly from the line. The gap rule absorbs the space width and justification, but not every kerning change. Check the pill's alignment on a device at 80% and 160% text size before calling it accurate.
- The recited word's span and the pill's colour switch can disagree for the length of one slide (about 150 ms). This is deliberate.
- The Reading and Focus callers pass `wordMotion="pill"`. Other callers keep the span default.
