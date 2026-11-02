# Prompt 15 — Wear OS app and tile (after 10)

Monorepo `D:\projects\quran-app`, `apps/mobile`. Follow @docs/plans/cursor/README.md. Read first: @docs/adr/0035-widgets-and-watch.md (after prompt 10: Wear OS added, misbaha adds to today's total) @apps/mobile/src/features/widgets/snapshot/types.ts (the snapshot is the only data the watch gets) @apps/mobile/plugins/with-widget-gallery-strings.js (config-plugin style) @apps/mobile/app.config.ts. Frames: `WatchHome`, `WatchSibha` and `WatchComplications` are drawn for Apple Watch. **Draw `WearTile`, `WearHome` and `WearSibha` (round, 192 dp, dark only per the Wear OS guidelines, Arabic and English) from the same tokens, and stop for approval before building.**

**Already done:** nothing. No Wear code exists.

**Dependencies (named; need the developer's approval before running; add each to the content-plan table with its version and release date):** Gradle, added by the config plugin, never by hand-editing `android/`:
- `com.google.android.gms:play-services-wearable`, on both the phone and the watch (Data Layer);
- `androidx.wear.tiles:tiles` and `androidx.wear.protolayout:protolayout` (the tile);
- `androidx.wear.compose:compose-material3` and `androidx.activity:activity-compose` (the watch app);
- Kotlin coroutines `play-services`.

Pin the latest stable versions that have a release in the last 12 months, and record them. No npm package.

**What to build:**
1. **Config plugin** `apps/mobile/plugins/with-wear-os.js`, registered in `app.config.ts`:
   - It copies `apps/mobile/wear/` (new, source of truth, committed) into `android/wear/` at prebuild.
   - It adds `include ':wear'` to `settings.gradle` and the phone-side Wearable dependency.
   - It gives the wear module the same `applicationId` as the phone app (a Data Layer requirement) and the same signing config.
   - It sets `minSdk 30` and `<uses-feature android:name="android.hardware.type.watch"/>` in the wear manifest, plus `com.google.android.wearable.standalone` = false.
   - It is idempotent (running prebuild twice gives the same files). Test that in `plugins/with-wear-os.test.js` with a fixture `settings.gradle`.
2. **Phone side.**
   - A small Expo module `apps/mobile/modules/wear-bridge/`, local and not published, with Kotlin, `expo-module.config.json` and a TS API `src/features/watch/wear-bridge.ts`.
   - `publishWearSnapshot(json)` puts a `DataItem` at `/taybah/snapshot`.
   - `onWearMisbahaDelta(cb)` receives `MessageClient` messages at `/taybah/misbaha/add` carrying `{ day: 'YYYY-MM-DD', delta: number, id: string }`.
   - Call `publishWearSnapshot` from `src/features/widgets/snapshot/publish.ts` next to the Android widget update, only on Android, and only when the module is present (a capability check, not a switch).
   - Deltas go to the misbaha store's today total (`src/features/sibha`) with dedupe by `id`, and **only for the matching local day**: a delta for another day is dropped. Then the snapshot republishes.
3. **Watch side** (`apps/mobile/wear/src/main/java/com/taybahapp/taybah/wear/`, Kotlin):
   - `SnapshotRepository` reads the DataItem and caches it in DataStore.
   - `NextPrayerTileService` is a ProtoLayout tile with the next prayer's name and time, today's misbaha total and a «+» clickable that sends a delta. Its timeline has one entry per remaining prayer of the day, so no countdown is needed.
   - `MainActivity` (Compose for Wear) has two pages: next prayer, and Misbaha. The Misbaha page has a big tap area, haptic per count, its own count with reset, and it sends deltas, batched every 2 s and on pause.
   - Strings in `wear/src/main/res/values/strings.xml` (Arabic) and `values-en/` (English), taken from the existing `widgets.*` texts. **No Quran or dhikr text.** RTL through `android:supportsRtl`.
4. Unit tests: Jest for `wear-bridge.ts` (mocked native module) and for the delta merge (dedupe, day mismatch, negative delta rejected). Kotlin JVM tests in `wear/src/test` for the snapshot parsing and the tile timeline (run with `./gradlew :wear:testDebugUnitTest`).

**Wear OS emulator (AVD) setup:**
1. In Android Studio's SDK Manager, install "Wear OS 5 (API 34) x86_64 system image". In Device Manager, create Virtual Device → Wear OS → "Wear OS Large Round", API 34.
2. Start it, then on the phone emulator install the **Wear OS** companion app from Play (use a Play-enabled phone image), or pair over adb: `adb -s emulator-5554 forward tcp:5601 tcp:5601` and pair in the companion app.
3. Build: `cd apps/mobile; npx expo prebuild --platform android --clean; cd android; ./gradlew :app:installDebug :wear:installDebug` (Metro stays on 8081).
4. On the watch: long-press the watch face → add the Taybah tile. Check the next prayer, «+» ×3 then the phone `/sibha` total +3, the Arabic and English watch locale, and that a delta sent while the phone was off is applied once on reconnect.

**Acceptance:** `prebuild --clean` twice gives a byte-identical `android/wear`; the tile and app match the approved frames; the misbaha total is consistent across the phone, the widget and the watch with no double count; the snapshot JSON on the watch contains no religious text; all Jest and Gradle unit tests pass; `npx expo-doctor` passes.

**Gates:** `npx jest src/features/watch src/features/sibha src/features/widgets plugins`, the full suite, `lint`, `tsc`, `./gradlew :wear:testDebugUnitTest`.
