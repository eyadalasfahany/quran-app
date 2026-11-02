# Prompt 10 — Widget snapshot and Android widgets (resume)

Monorepo `D:\projects\quran-app`, `apps/mobile`. Follow @docs/plans/cursor/README.md. Read first: @apps/mobile/CLAUDE.md @.claude/agent-rules.md @docs/adr/0035-widgets-and-watch.md (all of it, including §3.5 and §4) @apps/mobile/src/features/widgets @apps/mobile/app.config.ts @apps/mobile/plugins/with-widget-gallery-strings.js. Frames: `AndroidWidgets`, `AndroidWidgetsDark` (and `Widget*` for the shared layout). Render them with `python3 packages/design-tokens/scripts/frame-shot.py AndroidWidgets <scratchpad>/aw.png`.

**Dependency (named, already installed):** `react-native-android-widget` 0.26.0 is in `package.json`. Add its row to the `docs/content-plan.md` version table: version, release date (check npm), MIT, purpose "Android home-screen widgets (ADR 0035)". Then run `node .github/scripts/npm-audit.mjs`.

**Already done (don't redo):**
- `src/features/widgets/snapshot/*`: types, build, gather, select, deep links, labels, patch, publish, store, sync, prayer entries, golden fixtures `__fixtures__/full.json` and `no-location-no-plan.json`, with tests.
- `android/*`: the NextPrayer, NextPrayerWide, Progress, ContinueReading, Misbaha (with «+» through `task-handler.ts`) and Azkar widgets, OpenAppWidget, theme, fonts, ring, register, `entry.ts`, with tests.
- `components/WidgetSnapshotSync.tsx`, mounted in `app/_layout.tsx`. `index.ts` is the entry (registers the task before `expo-router/entry`).
- `app.config.ts` `ANDROID_WIDGETS`, plus the plugin with `@string/widget_<name>_label` and `values-en` strings.

**Remaining work:**
1. **Fix the route tests the widget sync broke.** `__tests__/{native-tabs-platform,menu-route,reciter-route,salah-route,root-layout-azkar,router,reader-route}.test.tsx` fail. The cause: `WidgetSnapshotSync` → `useAzkarProgressSummaries` → `src/features/azkar/data/progress-summary-store.ts:91` `listener.remove()`, because jest's native `ExpoSQLite.addListener` returns undefined. In `jest.setup.ts`, mock `expo-sqlite` as `{ ...jest.requireActual('expo-sqlite'), addDatabaseChangeListener: jest.fn(() => ({ remove: jest.fn() })) }`. Don't change production code for this. Re-run the seven files; if a 5 s timeout remains, find what the sync awaits on mount and fake it in that test.
2. **No religious text check.** Add `snapshot/no-religious-text.test.ts`. Build a snapshot from fixtures whose Azkar titles and verse text are the placeholder strings, then assert `JSON.stringify(snapshot)` contains none of them: only ids, counts, times, labels from `widgets.*` and verse keys or page numbers. Then grep the widget renderers to confirm none reads verse text.
3. **Percent sign:** remove `widgets.percentSign` and use `formatPercent` (`src/core/i18n`) in the Progress widget.
4. **Azkar widget when content exists:** confirm that `AzkarWidget` shows `widgets.azkarEmpty` when `useAzkarAvailable()`/the snapshot says there's no content, with no build flag. ADR 0035 decision 6's `AZKAR_WIDGET=1` is rejected (no switches).
5. **Exact alarms:** add `android.permission.SCHEDULE_EXACT_ALARM` to `android.permissions` in `app.config.ts`. Prompt 12 builds the request flow. Don't add `USE_EXACT_ALARM`.
6. **Settings row and help (frame first).** Draw a `WidgetsHelp` frame (light, dark, English) in `quran-app-screens.html`. Mirror the Settings sub-page layout (`settings/sources`) and use `SettingsGroup` rows. It explains how to add a widget on Android and iOS and which widgets exist (names from `widgets.*`). **Stop for the developer's approval.** Then build:
   - the row «الودجات والساعة» / "Widgets and watch" in `SettingsScreen.tsx`, in the Habits area after the reminders hub row, reusing `RemindersEntryRow`'s row pattern (or `SettingsRow` if that is what it uses);
   - the route `app/settings/widgets.tsx` and a screen `src/features/widgets/screens/WidgetsHelpScreen.tsx` composed of new components in `src/features/widgets/components/`, each with a test;
   - on Android only, a «إضافة إلى الشاشة الرئيسية» button per widget, using the library's `requestWidgetPinning` if 0.26.0 exports it (check `node_modules/react-native-android-widget`); otherwise no button.
7. **ADR 0035:** set the status to accepted (developer, 2 Nov 2026). Replace "Decisions that need the developer" with "Developer decisions (2 Nov 2026)":
   - (1) the set and frames approved;
   - (2) the three tools approved;
   - (3) **Wear OS added**, as a tile and app (prompt 15). The watchOS minimum version stays open;
   - (4) the widget «+» counts without opening the app, and the watch adds to today's total;
   - (6) the Azkar widget shows whenever content exists, with no flag;
   - (7) the Settings row with the help screen.

   List items 5, 8, 9 and 10 under "Still open" with the recommendation unchanged. Update spec §15's pointer.
8. **Deep links:** `snapshot/deep-links.ts` targets must be in the app's route allowlist. Test that each widget's tap opens its route: `/salah`, `/(main)/(home)`, `/read/<key>`, `/sibha`, `/azkar`.

**Acceptance:** all widget, snapshot and route tests pass; the full `npx jest` passes; `lint` and `tsc` have 0 errors; `npx expo-doctor` passes; a picker label in Arabic on an Arabic device and in English on an English one; no Quran or dhikr text in the snapshot; every widget matches `AndroidWidgets` in light and dark.

**Gates:** `npx jest src/features/widgets src/features/settings __tests__`, then the full suite; `npx expo-doctor`.

**Build and emulator:**
```powershell
$env:ANDROID_HOME="C:\Users\Asus\AppData\Local\Android\Sdk"; $env:Path="$env:ANDROID_HOME\platform-tools;$env:Path"
cd apps/mobile; npx expo prebuild --platform android --clean; npx expo run:android --no-bundler   # Metro stays on the developer's 8081
```
On `emulator-5554`:
- Long-press the home screen, open Widgets and add each Taybah widget.
- Screenshot with `adb exec-out screencap -p > <scratchpad>\w.png` and compare it with the frame.
- Tap «+» on Misbaha three times with the app killed (`adb shell am force-stop com.taybahapp.taybah.dev` or the dev bundle ID from `app.config.ts`). Open the app: `/sibha` shows today's total +3.
- Tap each widget body to check its deep link.
- Switch the emulator to English (`adb shell "setprop persist.sys.locale en-US; stop; start"`) and check the picker labels.
