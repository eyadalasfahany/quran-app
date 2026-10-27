# 0005 — Design tokens from the HTML design system until Figma can be read

Date: 2026-10-27 · Status: accepted · Amends the Phase 0 design decision (Figma as the source)

## Context

Phase 0 step 6 builds `@quran/design-tokens` from the Figma file's variables and text styles, with `quran-app-design-system.html` as a cross-check. When step 6 started, the Figma MCP server refused every call: the Starter plan's tool-call limit was used up. Exporting the variables from Figma by hand wasn't possible either.

The HTML design system defines the same token set as CSS custom properties. It covers light, sepia and dark colors, spacing, radii, glass, shadows, blur, font families, and a specimen for each type style.

## Decision

- Until the Figma file can be read, `@quran/design-tokens` is transcribed from `quran-app-design-system.html`:
  - Colors and shadows come from the three `[data-theme]` blocks.
  - Spacing, radii, blur and font families come from `:root`.
  - The type scale comes from the "Type" specimens.
- Aliases (`focus-ring` → `brand`, `glass-fallback` → `surface-raised`) are resolved to literal values.
- Font families are single names, not CSS stacks.
- Quran type styles keep their unitless line-height ratio, because reader scaling changes the size.
- `npm run check:html -w @quran/design-tokens` checks the transcription against the HTML: 180 values, 0 mismatches.
- Two tokens were added to the HTML and the package together:
  - `brand-surface` (`#1f4d40`) and `on-brand-surface` (`#f7f3ea`) are the same in every theme.
  - They color the continue-reading card. It stays deep green in dark, as the phone dark Home screen draws it; the dark `brand` (`#8cc5af`) would have turned it light green.

## Consequences

- The tokens are provisional. **Open:** diff them against the Figma variables and text styles once the MCP quota allows, and raise every disagreement with the developer.
- Components still follow the Figma file. Neither file had a sidebar or tablet layout (spec §16 open item).
  - So the expanded-window sidebar was drawn from the tokens in `quran-app-screens.html` ("Expanded window" section, light and dark), and the app's sidebar follows that drawing.
  - It still needs to be added to Figma.
