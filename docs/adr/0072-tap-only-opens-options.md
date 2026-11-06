# 0072 — A tap only opens the ayah's options

Date: 2026-11-06 · Status: accepted (developer, 6 Nov 2026) · Supersedes ADR 0069 and ADR 0070 decisions 1 and 2. Restores the tap rule of ADR 0037. Amends spec §12 (Tapping an ayah). ADR 0070 decisions 3 to 5 (saved wash, place wash) and ADR 0071 are unchanged.

## Context

ADR 0069 saved a gold highlight on every tap, and ADR 0070 removed it on the next tap. On a device, the small finger movement at the start of a scroll counts as a tap, so reading left permanent gold across the page. The developer wants only two marks shown by the app itself: the saved ayah and the reader's place.

## Decision

1. **A tap writes nothing.** A tap on an ayah, its number, or a long-press opens the options and nothing else, in every mode.
2. **Colours come only from the options.** The highlight row adds, changes and removes a colour. A tap never adds or removes one.

## Consequences

- The `ensureHighlight` and `removeHighlightIfAny` repository functions and the `reader.highlightRemoved` string are removed.
- Gold saved by an earlier development build stays until it is removed in the options. These builds never shipped.
- A small drag on the text can still open the options. It leaves no mark, and that behaviour predates these ADRs.
