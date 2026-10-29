# 0024 — Reader mini bar: idle state and drag-down collapse

Date: 2026-10-29 · Status: accepted · Amends spec §12 (motion) and the step 4b mini player

## Context

The mini player bar was hidden until something had played, so the reader had no visible way to start a recitation from the page in view. Showing it at all times, though, takes reading space from the Quran text. The developer asked for both: a bar that can play from where you are, and a way to push it out of the way (29 Oct 2026).

## Decision

1. **Idle in the reader.** In Reading and Mushaf modes on compact and medium windows, the reader bar shows even when the player is idle, once a reciter resolves (saved, else the default). Its subtitle is the top ayah on screen, «الفاتحة · الآية ٣», and its play starts there through `playFromVerse`, installing the reciter's pack if needed. The tabs and sidebar bars still hide when idle. Frame `#ReadingMiniIdle`.
2. **A down chevron** (16 × 8, `inkMuted` at 0.7) centred at the top of the reader bar shows that it can be dragged down. It is decorative; the drag and the accessibility action carry the meaning. Frames `#Reading` and `#ReadingMiniIdle`.
3. **Collapse.** A downward drag follows the finger and collapses the bar past half its height (34 pt) or above 800 pt/s, the velocity of ADR 0020's sheet detents; otherwise it springs back. Collapsed, it is a 64 × 24 glass capsule with a 28 × 4 grabber and a 44 pt target, and the gold progress line while playing. A tap or an upward drag past the same thresholds expands it. Frame `#ReadingMiniCollapsed`.
4. **Remembered** across pages, surahs and launches (MMKV `reader.miniCollapsed`).
5. **One footprint.** `useReaderMiniFootprint()` gives the bar's (108), the capsule's (62) or none. The lists' bottom inset, the resume pill and the word-follow band read it.
6. **Accessibility.** The bar has a "collapse" action («تصغير المشغّل»); the capsule is a button «إظهار المشغّل».
7. **Reduce Motion.** The content fades between the bar and the capsule; the glass switches without fading (`apps/mobile/CLAUDE.md`: glass never fades).

## Consequences

- Playback keeps going while collapsed; the capsule's gold line shows it.
- Focus mode has its own transport and no mini bar; its «٣×» toggles a 3× repeat of the focused ayah.
