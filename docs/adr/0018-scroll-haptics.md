# 0018 — Haptics while scrolling the reader

Date: 2026-10-28 · Status: accepted · Amends spec §12 (Motion: haptics)

## Context

Spec §12 ruled out haptics on scrolling and page changes because they happen often. The developer wants the reader to be felt while scrolling: each ayah in Reading mode and each surah in Mushaf mode.

## Decision

1. **Reading mode:** `selectionAsync()` each time the top ayah changes; `impactAsync(Light)` instead when the new top ayah is in a different surah from the previous one.
2. **Mushaf mode:** `impactAsync(Light)` when the top page changes to a page that holds the start of a surah. No per-ayah ticks.
3. **Focus mode:** no scroll haptics.
4. Every change of the top position ticks, including programmatic moves (opening at the last-read ayah, resize restore, audio follow). The first position after opening the reader or switching mode only sets the baseline.
5. At most one scroll haptic per 80 ms, so a fast fling gives a steady texture instead of a continuous buzz. When both are due, the surah tick wins.
6. No in-app switch for now; the system haptics setting turns them off. An in-app toggle would need a design frame first (ADR 0010).

## Consequences

- Haptics fire far more often than before; battery cost is small but real on long sessions.
- The simulator plays no haptics, so this is checked on a real iPhone (TestFlight).
- A page holding several short surahs gives one tick, not one per surah.
