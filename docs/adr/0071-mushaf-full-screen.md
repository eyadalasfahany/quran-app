# 0071 — Mushaf full screen

Date: 2026-11-06 · Status: accepted (developer, 6 Nov 2026) · Amends spec §12 and the Mushaf toolbar in `quran-app-screens.html` (frames `MushafFullscreenEnter`, `MushafFullscreen`).

## Context

The developer asked for a full screen Mushaf with a way out. A tap on the text already highlights an ayah, so a tap can't bring the controls back.

## Decision

1. **Way in.** A fourth button in the Mushaf tools pill. Mushaf mode only.
2. **What hides.** The toolbar, the player bar, the status bar and Android's navigation bar (`expo-navigation-bar`, developer 6 Nov 2026; a swipe from the edge shows it briefly). Audio keeps playing, and the return pill still shows when the recited ayah is off screen. An open side panel closes.
3. **Way out.** One glass button in the exact place of the full screen button, so the same spot toggles it, always visible, or the system back action.
4. **Not saved.** Each reader opens with the controls showing. Leaving Mushaf mode ends it.
5. **Tapping is unchanged.** Ayah taps, highlights and options work the same in full screen.

## Consequences

- `expo-navigation-bar` needs a native rebuild of the dev client. A build without it keeps the bar visible and does not crash.
- The exit button floats over the page and can cover text under it as the page scrolls.
