# 0043 — Interface text follows the window size

Date: 2026-11-01 · Status: accepted (developer, 1 Nov 2026) · Amends spec §4 (responsive layout) and the type scale in `packages/design-tokens` (ADR 0005, 0010).

## Context

The type scale in `@quran/design-tokens` is transcribed from the phone frames, which are drawn at 390 pt wide. Every window used the same sizes, so a 375 pt phone wrapped English labels that fit on the frame (the My Quran segments broke as «Bookmar / ks»), and an iPad showed phone-sized text in a window more than twice as wide.

The developer asked (1 Nov 2026) for text size to follow the screen size, set in the tokens, and chose a clamped width ratio over fixed steps per window class.

## Decision

1. **Factor.** `textScaleFor(window)` in `packages/design-tokens` returns `clamp(shortSide / 390, 0.9, 1.15)`, rounded to two decimals. `shortSide` is the shorter side of the window, so rotating a device never changes the text size, and a narrow Split View pane counts as a narrow window.
   - 390 pt gives 1.0, so the frames and `frame-shot.py` comparisons are unchanged.
   - Examples: 375 → 0.96, 402 → 1.03, 440 → 1.13, an iPad (768 and up) → 1.15.
2. **Scope.** The factor applies to every interface and display style in `typeScale` (`title`, `body`, `displayLg`, `dhikr` and the rest) and to the frame-specific sizes that override them. `scaleTextStyle()` scales size and line height together, so Amiri keeps at least `amiriNaturalLeading`.
3. **Not scaled.**
   - Quran text (`quranTypeScale`): it follows the reader's own 80–160% setting, and the mushaf font size comes from the page width (spec §4).
   - Icons, touch targets, spacing and radii.
4. **Dynamic Type stays.** The factor sets the base size. The system text size still multiplies it, capped by `maxFontScale` as before.
5. **Two places.** `UiText` applies the factor once to its final size and line height, token or override alike (`useTextScale()`, `src/core/theme`). `ThemeProvider` scales `theme.text`, so the text inputs and the tafsir passages that read `theme.text.body` get scaled sizes. Components never multiply by it themselves. The Sibha inputs set no size of their own and keep the system default.

## Consequences

- Text grows by up to 15% on large phones and iPads and shrinks by up to 10% on small windows. Fixed-height controls that hold text must allow that range; the review checks the largest and smallest cases.
- Screenshots on the iPhone 17 simulator (402 pt) show text 3% larger than the 390 pt frame. That difference is approved by this ADR.
- Tests cover the factor's boundaries (`apps/mobile/src/core/theme/textScale.test.ts`; the tokens package has no test runner) and the scaled sizes in `UiText`. Jest's default window is set to 390 × 844 (`jest.setup.ts`), so other tests see a factor of 1.
