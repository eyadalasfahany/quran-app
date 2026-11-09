# 0085 — UI fixes from the iPhone Pro Max review (9 Nov 2026)

Date: 2026-11-09 · Status: **accepted** (developer, 9 Nov 2026).

## Context

The developer reviewed the app on an iPhone Pro Max and reported:

- Amiri titles clipped: iOS cut the marks above the letters.
- Home's rails (quick links, «أذكار مختارة») cut off at the page gutter.
- Azkar card titles wrapped to two lines.
- The search placeholder sat on the wrong side in RTL.
- The selected segment was invisible in dark mode.

## Decision

- `UiText` display (Amiri) text gets top and bottom padding equal to the shortfall below `size × amiriNaturalLeading`, with an equal negative margin, so iOS stops clipping the marks above the letters and the layout spacing is unchanged. The padding scales with the system font scale, up to the text's max scale.
- Home's quick links and «أذكار مختارة» rows run edge to edge: the Home scroll view spans the gutter, and the rails pad by `gutterHome`. The `HomeAzkarLower` frames are updated to match.
- The «أذكار مختارة» card has a minimum width of 148 × the window text scale, and it grows with its title. The title stays on one line. The frames still draw short titles at a fixed 148; this ADR approves that difference.
- New colour token `segmentSelected` for the selected segment: light and sepia use surface-raised, dark uses fill-secondary (#24342f). It is added to the design system and to `colors.ts`. The design doc's preview iframes still carry the old dark look and fall back to surface-raised.
- iOS search fields under RTL use `inputTextAlignment` (`arabicTextDirection`), because iOS natural alignment follows the system language. Android keeps its previous behaviour.
- Update and offline notices float as one Liquid Glass card under the status bar (`FloatingNotice`): they spring down and up, never fade, and go solid under Reduce Transparency. No content push-down, because iOS native tabs ignore it. The offline card matches its own frame (a floating glass pill); the update card adds «تحديث» (the only coloured control). No dismiss: the user updates with «تحديث» (developer, 9 Nov 2026). Its edges follow the focused screen's content gutter (Home 20, others 24).
- Not changed: the native iOS tab bar's gap between icon and label. expo-router drops `titlePositionAdjustment`, and the developer chose to leave it.

## Consequences

- JavaScript only, so it ships as an EAS Update (`eas update --channel production`). No native change.
- Verified on the iPhone 17 Pro simulator in Arabic, light mode.
- Still to check on devices: the iPhone Pro Max, dark mode, and Android.
