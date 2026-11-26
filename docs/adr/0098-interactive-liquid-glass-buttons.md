# 0098 — Interactive Liquid Glass on round buttons and tappable glass

Date: 2026-11-26 · Status: **accepted** (developer, 26 Nov 2026). Builds on ADR 0012 (Apple HIG) and ADR 0033 and ADR 0036 (custom tab bar and rail).

## Context

- On iOS 26, Apple's own controls stretch, bounce and glow under a held finger. Our round buttons, the tab rail and the floating bar did not. Our glass was a background layer that never received the touch, and `isInteractive` was never set.
- Our glass also followed the device's appearance (`colorScheme="auto"`), not the app's theme. With the app set to Dark on a light iPad, the tab rail drew light glass under light icons and the tabs were almost unreadable.
- In October the glass had been moved behind its controls, because the older `expo-glass-effect` drew the glass over its children and swallowed their presses. Version 58.0.5 mounts children inside the effect's content view. A press through interactive glass was checked on the iPad simulator.

## Decision

1. `GlassSurface` follows the app's theme: dark glass in Dark, light glass in Light and Sepia. A surface that is always dark (the player) still passes `dark`.
2. `GlassSurface interactive` makes the glass the container, with the content inside it and `isInteractive` set. It is used on tappable glass:
   - the tab rail and the floating bar
   - the toolbar group
   - the mini player bar and both capsules
   - the resume pill
   - Seerah's edge chips, level chip and event pager
   - the ayah stepper, the focus transport and the player option bars.
   Static glass keeps the backdrop layer: the title pill, the year chip, panels, cards, notices, and the Seerah timeline card, which holds a slider.
3. Every round `IconButton` is interactive Liquid Glass where the platform has it: `raised` (search, back, header buttons), `glass`, and the sheet ✕ variants (`filled`, `track`, `surface`). One component carries it, so every screen gets it. `plain` stays plain, because it sits inside a glass toolbar group, and glass is never stacked on glass.
4. Without native glass (Android, older iOS, Reduce Transparency), each variant keeps its solid look from the design system.
5. Text buttons are unchanged.

## Consequences

- The frames still draw `raised` and the sheet ✕ as solid discs. On iOS 26 the app draws them as glass by this decision (developer, 26 Nov 2026).
- The tab bar's lens that glides between tabs is part of Apple's tab bar. The custom rail and floating bar stretch the pressed glass but do not glide a lens.
- The feel of the press and drag can only be judged by hand, on the simulator or a device.
