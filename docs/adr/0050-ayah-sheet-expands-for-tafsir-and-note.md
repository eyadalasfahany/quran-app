# 0050 — The ayah sheet expands for tafsir and notes

Date: 2026-11-02 · Status: **Accepted** (developer, 2 Nov 2026) · Amends ADR 0020 (sheet detents).

## Context

ADR 0020 opens every reader sheet at the mid detent and leaves it there until the reader drags it up. In the ayah sheet, tapping «التفسير» swapped the content to the tafsir at mid height, and tapping «ملاحظة» opened the note editor below the action tiles, out of view at mid. Either way the reader had to drag the sheet up to see what they had just asked for.

## Decision

1. Switching the ayah sheet to the tafsir, from the tafsir tile or the Tafsir tab, moves the sheet to the full detent.
2. Opening the note editor from the note tile moves the sheet to the full detent. Closing the editor leaves the sheet where it is.
3. Everything else in ADR 0020 is unchanged. Every sheet still opens at mid, including the `/tafsir` route. The side panel on expanded windows is not a sheet and doesn't change.

## Consequences

- The reader sees the tafsir or the note editor straight away, with no extra drag.
- The move uses the sheet's existing `expand()`, so it uses the same spring, Reduce Motion behaviour and VoiceOver announcement as the grabber's Expand action.
