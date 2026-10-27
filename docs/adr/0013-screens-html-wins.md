# 0013 — The screens HTML wins, and each visual has one owning component

Date: 2026-10-27 · Status: accepted · Amends ADR 0010 (design source), spec §4 and §12, Phase 2 step 8

## Context

A side-by-side check of the built screens against `quran-app-screens.html` (27 Oct 2026) found two kinds of problem.

**The screens drift from the drawing.** Sizes, weights, spacing and order differ on every reader screen. In several places the drawing disagrees with the spec or the design system:
- Sheets: the spec asks for a native `formSheet` with detents; the frames draw a custom card (an inset card with radius 36, a full-width tafsir sheet with radius 28, a 560-wide sheet on medium windows).
- The surah index row: step 8 asks for the transliterated name; the frame shows only the Arabic name.
- Quran sizes: the design system says Reading 28 / 2.2 and Focus 36 / 2; the frames draw 27 / 2.1 and 38 / 2.1.
- The Mushaf page cap: the spec says 640; the tablet frames cap the page at 600.

**The same visual is rebuilt in many files.** Text styles, Quran text, pill buttons, cards, gold frames, sheet headers, separators and toggles are each re-implemented in several components with slightly different values, so a design fix has to be repeated in every copy and usually misses one.

## Decision

1. **Where the screens HTML disagrees with the spec or the design system, the screens HTML wins.** The spec and the design-system file are updated to match:
   - Sheets stay custom cards drawn per frame, presented as a transparent modal (`form-sheet.ts`), not the native form sheet.
   - The index row's title is the Arabic name; the transliterated name is not shown.
   - `quran-reading` is 27 / 2.1, `quran-focus` 38 / 2.1, and the Focus neighbours `quran-focus-aside` 24 / 2.
   - The Mushaf page is capped at 600 pt.
2. **Features the app has but the frames don't draw stay**, styled with the frames' tokens: the tabs inside phone sheets, the "back to the current ayah" pill (spec §12), the translations list in reader settings, and the tafsir and translation action tiles.
3. **Restyle only.** Elements drawn in the frames for features that aren't built (Home content, the player, the script picker, search filters, the offline banner, word chips) wait for their feature.
4. **One owner per visual.** Each visual pattern lives in one component in `src/shared/ui/`, and screens and feature components compose it:
   - `UiText` for every interface and display string, `QuranText` for every Quran string.
   - `Button`, `Card`, `Divider`, `ScreenHeader`, `SheetHeader`, `GoldFrame`, `PageDivider`, `ToggleRow`.
   - Sizes the design repeats (touch target, strokes, icon sizes, fixed widths) are tokens in `@quran/design-tokens` (`size`, `stroke`), not literals.

## Consequences

- The work is Phase 2 step 11 (`docs/plans/phase-2/step-11-design-conformance.md`): the shared owners first, then the visual fixes screen by screen, each in its owning component.
- `check:html` keeps passing because the design-system type specimens move with the tokens.
- The native form sheet's system motion is replaced by the slide-up of a transparent modal; Reduce Motion follows the stack's own handling.
