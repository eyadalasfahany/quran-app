# 0049 — The surah header gets a notched band and a rosette

Date: 2026-11-02 · Status: **Accepted** (developer, 2 Nov 2026) · Amends the SurahHeader component in `quran-app-design-system.html`, the Reading, Mushaf, LoadingMushaf and tablet reader frames in `quran-app-screens.html`, and spec §4 / §12 (motion table).

## Context

The cartouche that opens each surah (`SurahCartouche`) is a plain pointed double frame, 52 px high, with an eight-pointed star in each end. The developer wanted a richer title in the style of a gold stock ornament they shared (a band with stepped, pointed ends over a mandala). That image can't be used as it is: it is a watermarked stock raster with no licence, it can't follow the light, sepia and dark themes, it is about three times taller than the band, and a bitmap can't draw itself in like the current outline. Mushaf pages give a surah title one line, so a tall ornament doesn't fit there.

## Decision

1. **Our own vector drawing, inspired by the reference, not a copy of it.** The band keeps flat top and bottom rules (outer 1.5 px, inner 0.9 px, 4.5 px apart); each end has a stepped notch at the corner and a concave sweep to a point. Only the band's straight run stretches with the width; the ends keep their shape.
2. **Two variants of `SurahCartouche`:**
   - **Full, 112 px**, used by `SurahHeader` (Reading and Focus modes): a 54 px band with a centred twelve-petal rosette (radius 50) above and below it. Each petal is an ogee with an inner rule, a bead past its tip and three small dots; twelve pointed leaves sit between the petals, with a fine ring. The rosette keeps its size at any width and is clipped to the space above and below the band.
   - **Compact, 52 px**, used on mushaf pages (`MushafPage`, `HafsMushafPage`): the band alone (48 px), so page layouts don't change.
3. **Gold hairlines only, never filled.** Every mark, the petal dots included, is a stroke in `gold`, so the cartouche follows all three themes and higher contrast, and the whole outline keeps the existing draw-in (`useDrawOnView`, `draw` 700 ms, shown drawn under Reduce Motion).
4. **The Reading-mode header shows «سورة {name}»** (`reader.surahTitle`), the same as mushaf pages and the design-system card.
5. Frames: the design-system SurahHeader card shows both variants; the Reading frame shows the full header above ayah 1; every mushaf frame shows the compact band (developer approved, 2 Nov 2026).

## Consequences

- Positive: a more distinctive surah opening that stays sharp, themed and animated, with no licensing question and no new assets or dependencies.
- Negative: in Reading mode each surah header is about 60 px taller, so the first ayah sits lower and the reading list's row heights change.
- Unchanged: mushaf page layout and line slots, the draw-in timing, accessibility (one header element labelled with the surah name), and non-negotiables 1 to 8. No Quran text is touched.

## Alternatives considered

- Ship the stock image. Rejected: watermarked and unlicensed, can't follow the themes, no draw-in.
- Band only everywhere (52 px). Offered as option A; the developer chose the rosette for Reading mode.
- Rosette at 132 px. Shown first; the developer asked for a lower one (112 px).
- Hide the rosette's middle by filling the band with the page colour. Rejected: the design system forbids filling the cartouche, and a fill shows as a block on any other background.
