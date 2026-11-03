# Widgets and Apple Watch (proposed follow-up)

Status: **proposed**. Nothing here starts until the developer approves ADR 0035 and the frames. Not a numbered phase; the current phase stays Phase 6 (spec §15 carries a pointer).

Rests on: `docs/adr/0035-widgets-and-watch.md` (the decision), ADR 0010 (frames first), 0016 (iOS 16.4), 0027 (local-only), 0030 (Salah), 0031 (Azkar rights), 0034 (Home, misbaha, daily progress); spec §2, §4, §6, §13, §14, §15; `docs/content-plan.md` (version table wins; new rows needed); `.claude/agent-rules.md`.

**Exit criterion:**
- On Android (emulator and one device if available) the widgets for Next prayer, Today's progress, Continue reading and Misbaha can be added, show the same values as the app, and open the right route.
- On iOS, the home-screen and lock-screen widgets show the same values as the app, count the next prayer down with no app running, and open the right route.
- On Apple Watch, next prayer, today's progress and the misbaha counter work with the phone out of reach; misbaha counts reach the phone's daily total exactly once; the complications change at each prayer.
- Nothing shows Quran text or dhikr text; Azkar surfaces are absent from builds without `AZKAR_WIDGET=1`.
- Airplane mode: everything above works. Clear-data empties every surface.
- Visual conformance against the frames, in Arabic and English, light and dark (watch: dark only).

**Rules:** all rules from `apps/mobile/CLAUDE.md` and `.claude/agent-rules.md`; the `apple-design` skill for the SwiftUI screens; tokens through the generated `Tokens.swift` and `@quran/design-tokens`, never hand-copied values; every widget layout is its own file with a colocated test where the stack allows it. Agents do not add dependencies, commit, or run `eas build`.

## Decisions that need the developer (before step 2 unless noted)

1. The widget set, its exclusions and the frames (step 1).
2. Tools and the three dependencies (step 3 and later): `@bacons/apple-targets` 5.0.0, `react-native-android-widget` 0.26.0, `react-native-watch-connectivity` 2.0.0.
3. watchOS minimum (10 or 11) and the watch scope.
4. Misbaha: widget «+» counts in place; watch keeps its own count and adds to today's total only.
5. Android prayer widget shows the time, not a countdown.
6. Azkar surfaces: gated by `AZKAR_WIDGET=1`; watch Azkar is read-only.
7. Navigation: the Settings row «الودجات والساعة» and its help sheet (step 9 needs its own frame).
8. App Group names, Apple setup, and Mac versus approved `eas build` for iOS and watch (steps 6 to 8).
9. Schedule: before beta, v1.1, or dropped.
10. Lock-screen privacy (prayer and percent only).

## Steps

| # | Step | Where it can be built | Status |
| :---: | :--- | :--- | :---: |
| 1 | Frames (ADR 0010) | Windows | drawn, awaiting approval |
| 2 | Snapshot module (platform-neutral TypeScript) | Windows | |
| 3 | Android spike: `react-native-android-widget` go or no-go | Windows (emulator) | |
| 4 | Android widgets | Windows (emulator) | |
| 5 | Design tokens to Swift (generator and drift check) | Windows | |
| 6 | iOS widget target spike, then iOS widgets | Mac or approved EAS | |
| 7 | Watch bridge and watch app | Mac or approved EAS | |
| 8 | Complications | Mac or approved EAS | |
| 9 | Usage help (Settings row and sheet) | Windows (RN part) | |
| 10 | Exit check | all | |

Build order is 1, 2, 3, 4, 5, then 6 to 8, with 9 any time after approval.

## Step briefs

### Step 1 — Frames (ADR 0010)

Drawn in `quran-app-screens.html`, new section «الودجات وساعة آبل» (id `widgets`), before the expanded-window section. From existing tokens only (`packages/design-tokens/src/colors.ts`), Arabic first, RTL. Values are mock values; no Quran text and no dhikr text.

| Frame id | Content |
| --- | --- |
| `WidgetNextPrayerSmall`, `…Dark` | iOS small (name, time, system timer), small with no location, medium (name, remaining, the five times, next shaded) |
| `WidgetProgressMedium`, `…Dark` | iOS small (ring), small empty, medium (ring and four rows), large (ring and six rows) |
| `WidgetContinueReading`, `…Dark` | iOS small and medium continue reading (brand card, wird line), misbaha small, Azkar status medium (gated) |
| `WidgetLockScreen`, `…Dark` | inline, rectangular and two circular accessory widgets on a light and a dark lock screen |
| `AndroidWidgets`, `…Dark` | Android 2×2 prayer and misbaha, 4×2 progress, continue reading, prayer with the five times |
| `WatchHome` | next prayer, the five times, today's progress, empty, stale, Azkar status (gated) |
| `WatchSibha` | counting, target reached, target picker, total and reset |
| `WatchComplications` | two faces: inline and rectangular; corner and circular |

Not drawn yet (needs decision 7): `WidgetsHelp` (the Settings help sheet) and an English variant of the widget frames. The English frames are a review item before step 4 ends; the layout is mirrored, so a mismatch shows only in text width.

Checks: `npm run check:html -w @quran/design-tokens` passes (done: 300 values, 0 mismatches). Render each id with `python packages/design-tokens/scripts/frame-shot.py <id> <out.png>` (set `CHROME`; write PNGs outside the repo) and look at every PNG for clipped Arabic marks.
Tests: none (design). Done when the developer approves the frames, or lists changes.

### Step 2 — Snapshot module

Platform-neutral TypeScript in `apps/mobile/src/features/widgets/`; no native dependency, so it is written and fully tested on Windows. ADR 0035 §4 is the contract.

Files (one responsibility each, each with its `*.test.ts`):
- `types.ts`: the snapshot type, `schemaVersion = 1`.
- `prayer-entries.ts`: `timesFor` for today and the next two days into `{ key, at }[]`, sunrise excluded, plus `validUntil`.
- `build-snapshot.ts`: a pure function over its inputs (now, coordinates or none, goals, progress lines, reading place, wird, misbaha, Azkar availability, locale, labels). Reuses `useDailyProgress`'s data builder (`features/home/data/daily-progress.ts`) rather than recomputing.
- `labels.ts`: reads the `widgets` key group from `ar.json` / `en.json`. Adds those keys (Arabic first) in the same change.
- `deep-links.ts`: the allowlist and the URL builder from the variant scheme.
- `merge-taps.ts`: idempotent intake of widget and watch deltas (ADR 0035 §3.3 and §3.5): per-source last `seq`, dated deltas, today-only rule.
- `sink.ts`: a `SnapshotSink` interface with a no-op default; the iOS (App Group) and Android (`requestWidgetUpdate`) implementations arrive in steps 4 and 6.
- `sync.ts`: `syncWidgets()` with a trailing debounce; wired to the existing triggers (launch, foreground with a changed day, time zone or coordinates key via `features/notifications/sync-state.ts`) and to the data-change events listed in ADR 0035 §4. A misbaha tap never calls it.
- A hook in `core/db/user/clear.ts` (or its personal-data clear list) that wipes the snapshot and calls the sink's reload.

Tests (spec §14 "App unit and component"; golden fixtures in `apps/mobile/src/features/widgets/__fixtures__/`, shared later with XCTest):
- Entries: 15 for three days, sorted, no sunrise, equal to `timesFor` for the same inputs; across a DST change (a date where the offset moves) and across a time-zone change the instants stay absolute.
- Builder: no location (entries empty, prompt state); no goals; goals with each row type; Khatma plan absent or active; Azkar absent (`azkar: null`) and present (counts only, no text); locale `ar` (Arabic-Indic numerals) and `en`; schema version present; no coordinates anywhere in the output (a test walks the JSON).
- No Quran text: a test fails if the snapshot contains any key or value that is an ayah text from `content.db`/Tanzil fixtures (only `surah`, `ayah`, `page`).
- Tap merge: same delta twice counts once; out-of-order `seq`; a delta dated yesterday is dropped; two sources merge independently; a widget delta advances the counter and the total, a watch delta only the total.
- Deep-link allowlist: accepts the seven routes, rejects `/salahx`, `/settings`, and an unknown scheme.
- `sync.ts`: debounce collapses a burst into one write; no write when nothing changed; clear-data wipes and reloads.
- `tsc --noEmit`, `eslint`, `npm test`.

### Step 3 — Android spike (go or no-go on `react-native-android-widget`)

Needs decision 2. One branch, one throwaway widget, the emulator.
- The developer installs `react-native-android-widget` at the exact version 0.26.0 (not with `npx expo install`; it is not Expo-managed) and approves the content-plan row. Run `node .github/scripts/npm-audit.mjs`.
- `app.config.ts`: the plugin entry, with `AZKAR_WIDGET` read from the environment like `APP_VARIANT`. Run `npx expo prebuild -p android` and `npx expo run:android`.
- Questions, each answered in a short note appended to ADR 0035 ("Spike results"):
  1. Compatibility with Expo SDK 58 and React Native 0.88 (new architecture): builds, adds, renders.
  2. A closed app: kill the app, add the widget, confirm it renders from MMKV and `quran-prefs` is readable by the headless task.
  3. RTL and Arabic: layout direction from the app language when the device is English; Amiri and IBM Plex Sans Arabic render; Arabic-Indic numerals.
  4. TalkBack: the widget announces a label for each tappable region (the library renders an image; check the content description).
  5. `OPEN_URI` with `taybah-dev://read/2:255` opens the reader at that ayah on cold start and on warm start.
  6. Size: 2×2 and 4×2 on the phone emulator, a tablet emulator, and the foldable emulator; calibration on first tap.
- **No-go** falls back to `expo-widgets` Android with the same snapshot (decision again), then to a native Kotlin provider.
Tests: none shipped from the throwaway; the notes are the output.

### Step 4 — Android widgets

Only after step 3 passes. Each widget layout is its own file with a colocated test (render, variants, tap actions, RTL, accessibility label) under `apps/mobile/src/features/widgets/android/`:
- `NextPrayerWidget` (2×2, 4×2; time only, no countdown), `ProgressWidget` (4×2), `ContinueReadingWidget` (2×2, 4×2), `MisbahaWidget` (2×2; the «+» runs `recordSibhaTap` from the task handler, no app launch), `AzkarStatusWidget` (4×2; included only with `AZKAR_WIDGET=1`).
- The task handler reads the snapshot builder over MMKV and renders by the widget's size.
- The Android sink calls `requestWidgetUpdate` for each kind; `updatePeriodMillis` is 30 minutes.
- Gallery name and description in `ar` and `en` resources.
- Colours and spacing from `@quran/design-tokens`; Amiri and IBM Plex Sans Arabic registered with the plugin.

Tests (spec §14):
- Jest component tests with the library's primitives mocked in `jest.setup.ts`: each layout renders the frame's content for given snapshots, the empty, no-location and stale states, `ar` and `en`, light and dark.
- Task handler test: `WIDGET_CLICK` for the misbaha action counts exactly one tap; `WIDGET_UPDATE` renders from the snapshot.
- Maestro or `adb`: deep link from each widget's `OPEN_URI` (`adb shell am start -a android.intent.action.VIEW -d …`) opens the route on cold and warm start. Maestro cannot tap home-screen widgets; adding and tapping a widget is a manual checklist item in the exit check.
- Visual: `adb exec-out screencap -p` of the emulator beside the frame (`AndroidWidgets`, `AndroidWidgetsDark`); a mismatch fails the review (`CLAUDE.md` frontend rule).
- Window matrix (spec §14): Android mid-range phone, foldable emulator folded and unfolded, 10-inch tablet.
- `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`.

### Step 5 — Design tokens to Swift

- `packages/design-tokens/scripts/gen-swift.mjs` writes `apps/mobile/targets/_shared/Tokens.swift` from `colors.ts`, `scale.ts`, `typography.ts` (light and dark sets, spacing, radii, type sizes, font names).
- A check script (like `check:html`) regenerates in memory and fails on drift; run in CI with the other token checks.
Tests: a Node test that the generated file has every colour key for both themes and that a changed value is detected. Runs on Windows.

### Step 6 — iOS widgets (spike first)

Needs decisions 2 and 8. A Mac or an `eas build` the developer approves.
1. **Spike (smallest possible):** install `@bacons/apple-targets` 5.0.0 (developer approves; content-plan row; audit). Add `apps/mobile/targets/widgets/expo-target.config.js` (type `widget`, deployment target 16.4, App Group from the variant: `group.<bundle id>`), and the `ios.entitlements` App Group in `app.config.ts`. One static widget reading `snapshot.json` from the App Group. Confirm: prebuild clean; builds for both bundle IDs; the entitlement and the extension register; the file the app writes (`ExtensionStorage`) is read by the widget. This also validates the `.dev` and production variants side by side.
2. **iOS sink:** write `snapshot.json` to the App Group and call `reloadAllTimelines`.
3. **Swift (kept small):** `Snapshot.swift` (Codable, ignores unknown fields, unknown major version gives the open-the-app state), `PrayerTimeline.swift` (one entry per prayer instant, `.atEnd`), views per family: `systemSmall`, `systemMedium`, `systemLarge`, `accessoryCircular`, `accessoryRectangular`, `accessoryInline`; `widgetURL` per kind from the allowlist; `Text(date, style: .timer)` with the app's locale; layout direction and locale from `snapshot.locale`; Amiri and IBM Plex Sans Arabic in the target's bundle with `UIAppFonts`; `AppIntent` button for the misbaha «+» (iOS 17 and later; on iOS 16 the tap opens `/sibha`) that increments `widgetTapsTotal`; VoiceOver labels that read the whole card; the tinted (`accented`) and vibrant (`vibrant`) rendering modes; Increase Contrast.
4. Gated kinds: the Azkar status widget is included only when `AZKAR_WIDGET=1`.
5. The app reads `widgetTapsTotal` on foreground and applies it with `merge-taps.ts`.

Tests:
- XCTest target (Mac): decode the shared golden fixtures; the timeline provider gives the same next-prayer sequence as the TS builder for the same fixtures, across the DST fixture; unknown version and past-`validUntil` give the empty and stale states.
- Jest: the iOS sink writes the file and requests a reload (native module mocked); the widget-tap intake.
- Gate (Mac or approved EAS): compile for iPhone and iPad; simulator screenshots on the iPhone 17 simulator (`xcrun simctl io booted screenshot`) beside the frames rendered at 390 × 844; lock-screen widgets on a device or the simulator; both appearances; Arabic and English; VoiceOver pass.
- Device matrix (spec §14): iPhone SE-size and Pro Max, iPad (widgets on the Home Screen), and the iOS 16 iPad (5th generation): the widgets show and open the app (no interactivity below iOS 17).

### Step 7 — Watch bridge and watch app

Needs decisions 3 and 8.
- **Phone side (TypeScript):** `react-native-watch-connectivity` 2.0.0 (developer approves). The spike confirms RN 0.88 and that `transferUserInfo` sent while the phone app is killed is delivered once at next launch. `watch-bridge.ts`: push the snapshot as application context after each `syncWidgets()`; receive deltas into `merge-taps.ts`. Test with the library mocked: context pushed after a sync; two deliveries of the same `seq` count once; deltas applied in `seq` order.
- **Watch target:** `apps/mobile/targets/watch/expo-target.config.js` (type `watch`, deployment target per decision 3). SwiftUI: a `TabView` with next prayer, today's prayers, today's progress, misbaha (and Azkar status with `AZKAR_WIDGET=1`). Context store in the watch container; states empty, fresh and stale (no time shown past `validUntil`).
- **Misbaha on the watch:** tap anywhere counts; `WKInterfaceDevice.current().play(.click)` per count and `.success` at the target; target picker 33, 99, 100 and custom by the Digital Crown; rounds counter; reset with confirmation; Double Tap as `handGestureShortcut(.primaryAction)` on watchOS 11. Each count appends to a local queue; batches go out with `transferUserInfo` `{ source: 'watch', installId, seq, date, taps }`.
Tests:
- XCTest (Mac): the queue produces dense, increasing `seq`; a batch is not lost across an app relaunch; the stale rule; the target and round arithmetic equal the TS `countTap` model on shared fixtures.
- Scenarios, manual with the paired simulator pair: count on the watch with the phone app killed, open the phone, today's total includes it once; count past midnight, the late delta is dropped; phone and watch out of range then back.
- Gate: compile, simulator screenshots for 41 mm and 49 mm beside `WatchHome` and `WatchSibha`.

### Step 8 — Complications

`apps/mobile/targets/watch-widgets/expo-target.config.js` (type `watch-widget`). `accessoryInline`, `accessoryRectangular`, `accessoryCircular` (next prayer), and `accessoryCorner` (progress ring) from the stored context, one timeline entry per prayer instant, `.atEnd`; reload after each new context. Tinted-face rendering. Tests: the shared timeline fixtures (XCTest); gate with a screenshot beside `WatchComplications`.

### Step 9 — Usage help

Needs decision 7. Draw `WidgetsHelp` (ADR 0010), get it approved, then build: a Settings row «الودجات والساعة» that opens a sheet (`SheetHost`, ADR 0020) with the steps per platform and a short «ما يعرضه وما لا يعرضه» list. One component per file with its test (render, RTL, role and label, interaction); all strings in `ar.json` / `en.json`. The row is hidden on a platform that has no such surface (the watch steps appear on iOS only). Tests: the sheet opens from Settings, the iOS-only text is absent on Android, Arabic and English.

### Step 10 — Exit check

- All checks for each app touched: `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`; `node .github/scripts/npm-audit.mjs` after any dependency change.
- Matrix (spec §14) plus: widgets on phone, iPad and the Android tablet; Apple Watch 41 mm and 49 mm; Arabic and English; light and dark; Increase Contrast and Bold Text; Reduce Motion; VoiceOver and TalkBack.
- Airplane mode on every surface; clear-data; a time-zone change and a DST change on the device; the stale state by setting the device date forward past `validUntil`.
- A full-offline watch scenario and the kill scenario (step 7).
- Visual review of every frame against its screenshot.
- The release blockers of ADR 0035.

## Release blockers

As listed in ADR 0035 ("Release blockers"): approval of the ADR and frames; dependencies approved, rowed and audited; the Android spike result; iOS and watch compile and review on a Mac or approved EAS; prayer-time parity across DST and time-zone changes; the watch kill scenario; clear-data; Azkar surfaces excluded until ADR 0031 clears; font licences recorded; App Store watch screenshots and privacy-label check.

---

## Follow-up — widget audit, add preview, theme (ADR 0054 draft)

Status: **proposed** until the developer approves `docs/adr/0054-widget-add-preview-and-theme.md` and the new frames.

Rests on: ADR 0035, 0010, 0053; spec §4, §6, §13, §14; existing frames in `#widgets` (`WidgetNextPrayerSmall`, `WidgetNextPrayerSmallDark`, `WidgetProgressMedium`, `WidgetContinueReading`, `WidgetLockScreen`, `AndroidWidgets`, …); `ConfirmDialog` in `quran-app-design-system.html` / `SibhaResetDialog` frame pattern.

**Exit criterion (this slice):**

- Every shipped widget kind matches its HTML frame (content, typography, colours) in Arabic and English, light and dark, for the sizes in ADR 0035 §2.
- Every tappable widget surface opens the allowlisted route (see `deep-link-routes.test.ts` and manual cold/warm checks on device).
- Tapping «إضافة» / pin anywhere in app flows through **`WidgetAddConfirmDialog`** (preview + confirm) before Android `requestPinWidget` or iOS instructions.
- Widget surfaces respect **app-resolved** `colorMode` from the snapshot when ADR 0054 is accepted (not only system appearance).
- Copy never promises lock-screen detection on iOS or duplicate detection on all Android launchers.

### Decisions (accepted 3 Nov 2026 with ADR 0054)

1. Snapshot field `colorMode: 'light' | 'dark'` — yes; keep `schemaVersion: 1`; missing field falls back to system.
2. Sepia on widgets: **map to light**.
3. Android: «Add anyway» when `getWidgetInfo` returns ids — **yes**.
4. `WidgetAddConfirm*` frames approved with ADR 0054; `WidgetsHelp` remains in HTML (prior approval path).
5. Default destination preference in MMKV (`widgets.addDestination`) — **yes**.

### Steps (append to delivery order after step 10, or in parallel once widgets compile)

| # | Step | Where | Depends on |
| :---: | --- | --- | --- |
| 11 | **Full widget audit** (content, frames, deep links) | Mac/iOS + Windows/Android | Steps 4 and 6 done |
| 12 | **Frames:** `WidgetAddConfirm*` (+ `WidgetsHelp` if still missing), EN variants | Windows | Decision 4 |
| 13 | **Catalog metadata:** map each UI entry → provider/kind, destination (home/lock), preview variant, frame id | Windows | 12 |
| 14 | **`WidgetAddConfirmDialog` + preview component** (`ConfirmDialog`, live snapshot preview) | Windows | 12, 13 |
| 15 | **Wire add flow:** `WidgetPinButton`, `WidgetsHelpPinRow`, Discover widget tour step → confirm dialog; iOS path = steps only | Windows (RN) | 14 |
| 16 | **Snapshot `colorMode`:** TS builder, tests, sync on appearance change | Windows | Decision 1 |
| 17 | **Native theme:** Swift + Android render use `colorMode` | Mac (Swift), Windows (Android) | 16 |
| 18 | **Android duplicate UX:** optional `getAppWidgetIds` gate + honest strings | Windows (emulator) | Decision 3, 15 |
| 19 | **Exit check (0054):** visual + tap matrix, theme mismatch cases, Discover + Settings flows | All | 11–18 |

### Step briefs (follow-up)

#### Step 11 — Full widget audit

Checklist derived from ADR 0035 §2 and `WIDGET_PROVIDERS` / `TaybahWidgets.swift`:

| Surface | Frame ids | Tap target |
| --- | --- | --- |
| Next prayer (iOS small/medium, Android 2×2/4×2) | `WidgetNextPrayerSmall`, `…Dark`, `AndroidWidgets`, `…Dark` | `/salah` |
| Progress | `WidgetProgressMedium`, `…Dark`, Android 4×2 | `/daily-goals` |
| Continue reading | `WidgetContinueReading`, `…Dark`, Android 2×2/4×2 | `/read/<verseKey>` |
| Misbaha | frames above + Android 2×2 | `/sibha`; «+» in-widget only |
| Azkar status | medium / 4×2 when content installed | `/azkar` |
| Lock (iOS) | `WidgetLockScreen`, `…Dark` | prayer → `/salah`; circular progress → `/daily-goals` |

**Screenshot note (developer, Nov 2026):** iOS small next-prayer **dark** on device matches `WidgetNextPrayerSmallDark` intent (header, name, time, المتبقي, mint countdown).

Tests: keep `deep-link-routes.test.ts` green; add audit checklist artifact in step brief only (no religious text in report). Manual: `adb shell am start …` per provider; iOS simulator tap each kind. **Gate:** `taybah-feature-reviewer` compares each frame to device screenshot.

#### Step 12 — Frames for add confirm

Draw centered-card dialogs (see `SibhaResetDialog`): scrim, icon optional, **embedded widget mock** at true widget aspect ratio, destination control (segmented: home / lock), primary «متابعة» and cancel. Light, dark, Arabic, English. Run `npm run check:html -w @quran/design-tokens`.

Tests: none (design). Done when developer approves.

#### Step 13 — Catalog metadata

Extend `widgets-help-catalog.ts` (or sibling `widget-add-catalog.ts`) with: `frameId`, `previewFamily`, `destinations: ('home' \| 'lock')[]`, `iosKind` / `androidProvider`. Lock destination on iOS (WidgetKit kinds) and on Android for next prayer and progress only (`home_screen|keyguard`, gallery steps after confirm).

Tests: unit test that every catalog row has a frame id present in HTML (grep or design-tokens check script).

#### Step 14 — WidgetAddConfirmDialog

Components (one file each + tests): `WidgetPreviewMock` (RN layout mirroring Android Jest primitives or static Image from frame — **spike in brief**), `WidgetDestinationPicker`, `WidgetAddConfirmDialog` composing `ConfirmDialog` actions.

Tests: render preview for each catalog row; RTL; a11y; theme tokens; interaction confirm/cancel.

#### Step 15 — Wire flows

- Replace direct `WidgetPinButton` press with open confirm; on confirm Android → `requestPinWidget`.
- `DiscoverWidgetSheet`: either open confirm for «widget» tour step or deep-link to Settings widgets with confirm — **match ADR 0054 §1**.
- iOS: confirm → show steps `WidgetsHelpIosGroup` filtered by kind.

Tests: update `WidgetPinButton.test.tsx`, `DiscoverWidgetSheet.test.tsx`, `WidgetsHelpPinRow.test.tsx`.

#### Step 16 — Snapshot colorMode

Add field to `types.ts`, `build-snapshot.ts` input from `resolveThemeName` (map sepia per decision). Bump `schemaVersion` if major. Widgets ignore unknown fields (0035 §4).

Tests: builder emits `colorMode`; appearance automatic + dark system; dark after Maghrib; sync fires on `saveAppearance`.

#### Step 17 — Native colorMode

- Swift: `Snapshot.swift` decode; views use `TaybahTokens.palette(for: snapshot.colorMode)`.
- Android: single palette in `context.ts` from snapshot.

Tests: golden fixtures; Jest render tests; XCTest decode on Mac.

#### Step 18 — Android duplicate UX

If decision 3 yes: before pin, query app widget ids; branch dialog copy. Document launcher limitations in `widgetsHelp` strings.

Tests: mock `AppWidgetManager`; manual checklist on Pixel emulator + one OEM if available.

#### Step 19 — Exit check (0054)

Re-run step 10 matrix subset for widgets only; plus add-flow screenshots vs `WidgetAddConfirm*` frames; verify app theme light while system dark (and reverse) after sync.

### What ships where

| Work | Windows / Android emulator | Mac / iOS device |
| --- | --- | --- |
| Steps 12–16, 18 (RN), Android 17 | Yes | — |
| Step 11 lock/accessory visual audit | — | Yes |
| Step 17 Swift | — | Yes |
| iOS add flow (instructions) | RN only | Verify copy |
| Discover + ConfirmDialog UI | Yes | Screenshot optional |

### Must not promise (product copy and UX)

- iOS: one-tap add to home or lock from inside Taybah.
- Detecting or blocking duplicate **lock-screen** widgets.
- Reliable «already pinned» on all Android launchers (Samsung, MIUI, etc.).
- One-tap lock-widget add on Android from inside Taybah (`requestPinWidget` is home-only; lock uses the system lock-screen gallery on Android 16 QPR2+).
- Widget sepia until ADR 0054 decision 2 is yes and implemented.
