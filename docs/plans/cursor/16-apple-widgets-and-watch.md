# Prompt 16 — iOS widgets and Apple Watch code (after 10; written on Windows, not buildable here)

Monorepo `D:\projects\quran-app`, `apps/mobile`. Follow @docs/plans/cursor/README.md. Read first: @docs/adr/0035-widgets-and-watch.md (§2-§5 and the developer decisions from prompt 10) @apps/mobile/src/features/widgets/snapshot (types and golden fixtures: the Swift side decodes exactly this JSON) @apps/mobile/app.config.ts. Frames: `WidgetNextPrayerSmall(Dark)`, `WidgetProgressMedium(Dark)`, `WidgetContinueReading(Dark)`, `WidgetLockScreen(Dark)`, `WatchHome`, `WatchSibha`, `WatchComplications`.

**This machine is Windows. Xcode can't run here, so nothing in this prompt can be compiled or run.** Write the code so that a Mac (`npx expo prebuild -p ios && open ios/*.xcworkspace`) or an `eas build` the developer approves can build it. Say so in your summary and list what was not verified. Don't run `eas build`.

**Already done:** the snapshot module and its fixtures (prompt 10). No iOS target code.

**Dependencies (named in ADR 0035 decision 2; developer-approved there):** `npx expo install @bacons/apple-targets` (pin 5.0.0 if Expo doesn't choose a version) and `npx expo install react-native-watch-connectivity` (2.0.0). Add a content-plan row for each and run `node .github/scripts/npm-audit.mjs`.

**Open and not decided here (leave the placeholders and report them):**
- the watchOS minimum (10 or 11): use 10 and mark it `// OPEN: ADR 0035 decision 3`;
- the App Group id: use `group.` + the bundle id from `app.config.ts` for each variant;
- whether the lock-screen widget shows only the prayer and the percent (decision 10): build exactly that.

**What to write:**
1. `app.config.ts`: add the `@bacons/apple-targets` plugin, and `ios.entitlements["com.apple.security.application-groups"]` per variant.
2. **Phone side, writing the snapshot:** a local Expo module `modules/app-group-store/` (Swift, iOS only) with `write(json)` into the App Group `UserDefaults` key `taybah.snapshot`, plus `WidgetCenter.shared.reloadAllTimelines()`. Its TS wrapper is `src/features/widgets/ios/app-group.ts`. Call it from `snapshot/publish.ts` on iOS, behind a capability check (module present), never a flag. Jest test with a mocked module.
3. **Widget target** `targets/widget/` (`expo-target.config.js`, type `widget`, the App Group):
   - `Snapshot.swift`: `Codable` structs mirroring `snapshot/types.ts` field for field.
   - `Provider.swift`: a timeline with one entry per remaining prayer of the day, plus a midnight entry.
   - The widgets `NextPrayerSmall`, `ProgressMedium`, `ContinueReading` and `LockScreen` (`.accessoryRectangular` and `.accessoryCircular`).
   - Deep links: the URLs in `snapshot/deep-links.ts` with the app scheme.
   - Colours copied from `@quran/design-tokens` into `Assets.xcassets` colour sets, with a comment naming each token. Fonts: the IBM Plex Sans Arabic files from `assets/fonts/`.
   - Localised strings in `ar.lproj` and `en.lproj`, from `widgets.*`. **No Quran or dhikr text.**
   - Misbaha «+» on iOS 17+ through an `AppIntent` that patches the App Group snapshot the same way `snapshot/patch.ts` does. Mirror its logic and cite it.
4. **Watch target** `targets/watch/` (type `watch`, SwiftUI): `WatchHome` (next prayer) and `WatchSibha` (its own counter, haptic, sends `{day, delta, id}` with `WCSession.transferUserInfo`). Complications per `WatchComplications`. Phone side: `src/features/watch/apple-watch.ts` uses `react-native-watch-connectivity` to send the snapshot (`updateApplicationContext`) and to receive deltas. Use the same merge function as Wear (prompt 15). If 15 hasn't run, create `src/features/watch/misbaha-delta.ts` with tests: dedupe by id, same local day only, positive deltas only.
5. **Swift fixtures check that runs on Windows:** add a Jest test that loads `snapshot/__fixtures__/*.json` and checks that every key in `Snapshot.swift`'s `CodingKeys` exists in the TS type (parse the Swift file with a regex) and the other way round. That way a drift fails CI here.

**Acceptance (what can be checked on Windows):**
- `lint`, `tsc` and Jest are green.
- `npx expo-doctor` passes.
- `npx expo config --type introspect` shows the targets and the App Group.
- The Swift/TS key test passes.
- No religious text in any target.

**Mac checklist (for the developer, put it in the summary):** prebuild; build the widget and watch schemes; add each widget on the iPhone 17 simulator and compare it with its frame (`xcrun simctl io booted screenshot`); tap «+»; run the watch app on a paired watch simulator and check the delta reaches `/sibha`.

**Gates:** `npx jest src/features/widgets src/features/watch`, the full suite, `lint`, `tsc`, `npx expo-doctor`.
