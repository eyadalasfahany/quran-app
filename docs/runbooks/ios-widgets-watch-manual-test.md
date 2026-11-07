# iOS widgets and Apple Watch — manual test (Mac only)

Windows cannot compile these targets. After `npx expo prebuild -p ios` on a Mac, open the generated `.xcworkspace` and follow this checklist against the frames in `screens/` (section `widgets`).

## Prerequisites

- Apple Developer account with App Groups enabled for `group.com.taybahapp.taybah` and `group.com.taybahapp.taybah.dev`
- Xcode 16+, CocoaPods 1.16.2+
- iPhone and paired Apple Watch simulators (iPhone 17 + watch pair)

## Build

```bash
cd apps/mobile
nvm use
npm ci
npx expo prebuild -p ios
open ios/*.xcworkspace
```

Build schemes: main app, `TaybahWidgets`, `TaybahWatch`, `TaybahWatchWidgets`.

## Widgets (iPhone)

1. Run the main app once (dev client) so the snapshot sync runs.
2. Add each widget: Next prayer (small/medium), Today's progress, Continue reading, Misbaha, lock-screen inline/rectangular/circular.
3. Compare light and dark with frames `WidgetNextPrayerSmall(Dark)`, `WidgetProgressMedium(Dark)`, `WidgetContinueReading(Dark)`, `WidgetLockScreen(Dark)` (`python3 packages/design-tokens/scripts/frame-shot.py <id> out.png` at 390×844).
4. Tap each widget surface — routes: `/salah`, `/daily-goals`, `/read/<verseKey>`, `/sibha`.
5. Misbaha «+» (iOS 17+): count increases without opening the app; foreground the app — today's total increases once per tap (`widgetTapsTotal` merge).
6. Airplane mode: widgets still show last snapshot; past `validUntil` shows stale copy, no guessed times.
7. Settings → مسح البيانات: widgets show open-the-app state.

## Watch

1. Install the watch app from the Watch companion.
2. `WatchHome`: next prayer timer, progress ring — frame `WatchHome`.
3. `WatchSibha`: tap counts, haptic, target ring — frame `WatchSibha`.
4. Kill the iPhone app, count on watch, reopen phone — today's misbaha total includes watch taps exactly once.
5. Complications — frame `WatchComplications`.

## Regression

- Arabic and English app language (snapshot `locale`, RTL).
- DST / time-zone change: widget prayer times match in-app Salah.
- VoiceOver on each widget (whole-card label).
