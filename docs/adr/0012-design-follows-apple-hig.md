# 0012 — The design follows the Apple HIG review

Date: 2026-10-27 · Status: accepted · Amends ADR 0010 (design source) and the RTL media rule in `apps/mobile/CLAUDE.md`

## Context

An `apple-design` skill review of the HTML design files and tokens found problems. The developer asked for the design to match Apple's guidelines, including where that reverses an existing rule.

**Colour**
- The four user highlights and the recited-ayah wash had almost the same lightness: 0.74–0.77 in light. The recited ayah also looked like the gold highlight. The design system said each highlight "differs in lightness", which was not true.
- Gold-family fills had five meanings.
- No colour had an Increase Contrast value.
- The screens used colours that weren't tokens.

**Interaction**
- In Mushaf, ayah actions were long-press only.
- In Focus, moving to the next ayah was swipe only.

**Conflicts with project rules**
- **Media in RTL.** The project said audio progress and media controls are never mirrored. The HIG says: "Flip controls that show progress from one value to another" and flip "next or previous buttons that let people access items in an ordered list".
- **Appearance.** The project offered only reader themes. The HIG says: "Avoid offering an app-specific appearance setting… they may think your app is broken because it doesn't respond to their systemwide appearance choice."

## Decision

1. **Appearance**
   - The default is Automatic («تلقائي»): light or dark to match the device.
   - Light, sepia and dark stay available as reader choices.
   - Dark after Maghrib stays as an opt-in.
2. **Audio follows RTL**
   - Progress bars fill from the right, with elapsed time on the right. This covers the player, the mini-player line and download bars.
   - Next ayah sits on the left, and its glyph points left.
   - Play and pause glyphs never flip.
   - In English (LTR) all of the above mirrors: progress fills from the left with elapsed time on the left, and next ayah sits on the right. The controls follow the layout direction, as the HIG asks (clarified by the developer, 29 Oct 2026).
   - Android's Material convention keeps media LTR. We follow the HIG on both platforms for one consistent design.
3. **Highlights**
   - Light and sepia user highlights step down in lightness: gold, green, blue, rose.
   - The recited ayah uses a near-neutral wash, never gold. The filled `brand` marker and, in Reading mode, a leading `brand` rule carry the state.
   - *Amended 2026-10-28:* the ayah marker is the end-of-ayah mark, Amiri Quran's ornate parentheses around the number (`﴿١﴾`), in place of the ring, in every view the app draws markers in. In the Tanzil Mushaf page it sits inline, with the ayahs flowing as one paragraph per surah; in Reading and Focus it stands alone with a 44 pt target. It rests gold with an ink number and turns `brand` when active, since a text mark can't fill.
   - In page-exact Mushaf (QCF) the ayah marker is a font glyph, so it is never recoloured. A `brand` rule in the page margin beside each line of the recited ayah carries the state instead.
   - In dark the fills can't differ in lightness and keep ink at 7:1. Names carry the difference instead: the swatch check mark, the list labels, and each ayah's accessibility label.
   - None of these cues touch the Quran glyphs.
4. **One meaning per colour**
   - Gold fills mean the gold highlight only.
   - Search matches inside Quran text get a `brand` outline.
   - "Last read" uses `surface-raised` with a `brand` glyph.
   - Khatma "today" is an outlined `brand` cell.
5. **New tokens**
   - `fill-secondary`, `line-strong`, `on-brand-surface-muted`, `chart-blue`, `chart-gray` and `player-line`.
   - `highContrast` overrides per theme for `line`, `line-strong`, `ink-muted` and `glass-stroke`. They are chosen from iOS `isDarkerSystemColorsEnabled` or Android `isHighTextContrastEnabled`; `DynamicColorIOS` is not used, because the theme is the app's own.
   - `check:html` now also checks the `[data-contrast=more]` blocks.
6. **Gesture alternatives**
   - Ayah actions open on long-press, on a tap on the ayah marker (44pt hit area), and from an ayah-actions glass button.
   - Each ayah exposes them as accessibility actions.
   - Focus mode gets previous and next ayah buttons.
7. **Other rules in the design system**
   - Touch targets are 44pt (48dp on Android), extended by hit area where a control draws smaller.
   - One glyph per destination. My Quran uses `bookmark`, not `pencil`; Hadith uses `text.quote`.
   - At most one glass group per screen edge plus back, and a scroll edge effect under floating controls.
   - Bold Text moves every UI style up one weight.
   - Toggles use the platform `Switch`.
   - Sidebar hover and pressed are half-strength `glass-selected`, with a keyboard focus ring.
8. **Not changed**
   - The custom sidebar stays. The HIG only says "consider a convertible tab bar", and the Phase 0 reasons hold: the 840 breakpoint and Android parity.

## Consequences

- **Open:** check on device that the QCF margin rule lines up with the mushaf lines on every page width. Tapping a QCF marker still opens ayah actions through the nested `Text` `onPress`.

- The design is updated in steps:
  1. The design system and tokens (this change).
  2. The phone and expanded screens.
  3. The type scale. Body moves toward the HIG's 17pt default, and each UI style maps to a Dynamic Type style.
- **App follow-ups (code, not done here):**
  - Automatic appearance.
  - High-contrast and Bold Text handling in `ThemeProvider`.
  - My Quran's `bookmark` glyph in `destinations.ts`.
  - Sidebar hover and focus states.
  - RTL audio progress when the player is built.
