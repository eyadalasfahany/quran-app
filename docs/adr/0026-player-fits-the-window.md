# 0026 — The full player fits the window; only the ayah card scrolls

Date: 2026-10-30 · Status: accepted · Amends the step 4 player layout (`#Player`)

## Context

The player kept every part at its frame size and gave the ayah card what was left. The artwork alone is 220 pt, so on an iPhone the card's share fell just under its two-line minimum, and on smaller phones below zero. The whole player then scrolled as a page when it opened. The developer ruled that out (30 Oct 2026): the player has a fixed height, and only the ayah card scrolls, following the recited word.

## Decision

1. **The card has a fixed height relative to the window:** 22% of the height inside the frame padding. It is never less than two lines of Quran text, and never more than 40%. A short ayah sits centred in it. A long ayah scrolls inside it, and the counter stays pinned below.
2. **The artwork gives way.** It shrinks from the frame's 220 pt down to 120 pt to make room for the card. Below 120 pt it hides, and the card takes the freed room.
3. **The card follows the word.** While playing, its text scrolls to keep the recited word's line in view, as before.
4. **Last resort.** The page scrolls only when even the card's two-line minimum cannot fit with the artwork hidden, which happens only at the largest accessibility text sizes.
5. **Spare height** on tall windows (iPad) stays above the options bar, as the frame's `margin-top: auto` puts it.

## Consequences

- On a 390 × 844 phone the artwork is about 190 pt instead of the frame's 220 pt, and the card is about 170 pt tall whatever the ayah's length. The review compares against `#Player` with this difference approved.
- The transport no longer moves between short and long ayahs.
