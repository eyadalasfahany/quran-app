# 0073 — The Mushaf keeps and returns to the exact ayah

Date: 2026-11-06 · Status: accepted (developer, 6 Nov 2026) · Amends spec §12, ADR 0037 decision 5 and ADR 0070 decision 3. ADR 0046 (one current ayah) is unchanged.

## Context

The developer found three faults in Mushaf mode (6 Nov 2026). The saved place was always the first ayah of a page, so scrolling to the middle of a page lost it. Going to an ayah scrolled to the top of its surah's text on that page, not to the ayah. A colour picked for the saved ayah never showed.

Tests also found a player fault. The reader's own copy of the place goes stale while audio plays after a drag, and every visible-page report wrote it back. So with the audio paused on ayah 24, the bar could move to ayah 23 with no scroll.

## Decision

1. **The saved place is the top ayah on screen.** When a drag or its fling ends and nothing is playing, the place becomes the ayah holding the first line at least half visible below the toolbar. A line starting with the end mark of the ayah before it belongs to the next ayah.
2. **Only a hand scroll moves the place.** A visible-page report no longer writes it. A viewport change, such as entering full screen, cannot move it.
3. **Going to an ayah puts its first line at the top of the screen,** from every route into the Mushaf. The first ayah of a surah also shows the surah title above it.
4. **The marks stay as ADR 0070 has them.** The reader's place keeps its wash from a continue-reading control until the first drag. The saved ayah keeps its green.
5. **An ayah's own colour wins over the saved green.** ADR 0072 stopped taps adding gold, so a colour on an ayah is now always the reader's choice. This restores the first version of ADR 0070 decision 3.

## Consequences

- The toolbar's page and surah update when the scroll ends, not during it.
- The first page reports its lines before a scroll can end. If a line position is not known yet, the place falls back to the first ayah of the visible page.
- While audio is paused, the recited wash stays where it stopped, and a hand scroll moves the bar to the new place (ADR 0046).
