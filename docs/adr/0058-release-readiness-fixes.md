# 0058 — Release-readiness fixes (Firebase, watch sync, Android permissions, purpose strings, Amiri in widgets)

Date: 2026-11-04 · Status: **accepted** (developer asked to "fix all issues" after the release review, 4 Nov 2026) · Branch: `ft/salah-screen-refactor` · Rests on ADR 0016 (bundle IDs), ADR 0035 (widgets and watch app), ADR 0030 (foreground location), ADR 0047 (adhan sounds and exact alarms) · Amends ADR 0035 §3 (watch data path) · Approved difference from frame `#Settings` (see §4)

## Context

The release review found issues that block a store build or contradict what the app declares:

1. **Firebase.** `app.config.ts` bundled `google-services.json` for production Android. The file is not in the repo, so the build failed, and v1 has no push notifications, so nothing needs Firebase. Keeping an unused SDK also contradicts the Play Data safety form ("No data collected").
2. **Watch data path.** The watch read the App Group, which is not shared with the iPhone, and never activated WatchConnectivity. The complications and the watch home screen therefore showed nothing from the phone.
3. **Android permissions.** Libraries and the template add permissions the app does not use (activity recognition, legacy storage, overlay, cloud messaging).
4. **iOS purpose strings and privacy manifests.** Location and motion strings were missing for some keys, and the widget and watch extensions write to the App Group without a privacy manifest.
5. **Amiri in widgets.** The widget extensions drew Amiri text without the font being bundled in those targets.

## Decision

### 1. Firebase is removed from v1

- `googleServicesFile` is removed from `app.config.ts`. v1 has no push (ADR 0027 is local-only), so no Firebase SDK is needed.
- To restore Firebase later (for example, for push), re-add `googleServicesFile` and the `google-services.json` file, and update the Play Data safety form in the same release.

### 2. The watch receives the snapshot over WatchConnectivity

- The iPhone sends the widget snapshot with `updateApplicationContext({ snapshot: <json string> })` (ADR 0035 §3).
- The watch activates `WCSession`, reads `receivedApplicationContext` on activation and each update, and stores the JSON in its own App Group (`group.<host>` for `<host>.watchkitapp`). The watch complications read that group (`group.<host>` for `<host>.watchkitapp.watchwidgets`).
- The watch's sibha counter sends its deltas with `seq`. `seq` persists across launches in `UserDefaults` (`taybah.watch.seq`), because the iPhone dedupes on `seq`. Deltas are sent only once the session is activated; before that the tap changes the watch count only.
- The watch home screen shows the next prayer's time and the `watch_open_iphone` string (ar, en) when no snapshot has arrived.

### 3. Blocked Android permissions

- Every production and development build blocks `ACTIVITY_RECOGNITION`, `READ_EXTERNAL_STORAGE` and `WRITE_EXTERNAL_STORAGE`. Production also blocks `SYSTEM_ALERT_WINDOW` and `com.google.android.c2dm.permission.RECEIVE`.
- Development keeps `SYSTEM_ALERT_WINDOW`, which the dev launcher needs.
- `SCHEDULE_EXACT_ALARM` stays: prayer and reminder alarms use it (ADR 0047).
- On Android, a prayer bell turned on triggers the exact-alarm prompt. It is a `ConfirmDialog` (shared component, ADR 0034), so no new layout is added (see §5).

### 4. iOS purpose strings and privacy manifests

- `plugins/with-ios-purpose-strings.js` sets the location and motion purpose strings in Arabic. `app.config.ts` `locales` supplies the English. The plugin is registered first, so it runs last and overrides the library defaults. In production it removes `NSLocalNetworkUsageDescription`, which only the dev launcher needs.
- Location is foreground-only (ADR 0030), so the Always keys carry the same text.
- The app's privacy manifest declares `NSPrivacyAccessedAPICategoryUserDefaults` with reasons `CA92.1` (the app) and `1C8F.1` (the App Group snapshot). The widget and watch-widget extensions each carry a `PrivacyInfo.xcprivacy` with `1C8F.1`. The watch app has none of its own: React Native's aggregation already gives it one, and a second would break the build.
- **Approved difference from frame `#Settings`:** the About section of Settings gets a «سياسة الخصوصية» row (privacy policy link). Guideline 5.1.1(i) requires a privacy policy reachable inside the app. This is the only visual change; no other layout changes.

### 5. Exact-alarm prompt on Android

- Turning on a prayer bell on Android shows the exact-alarm prompt (`ConfirmDialog`) when the system has not granted exact alarms. No new layout or frame is added.

### 6. Amiri in the widget extensions

- `Amiri-Bold.ttf` and its OFL licence are bundled in `targets/widget` and `targets/watch-widgets`. The Android widgets already use the same face (`app.config.ts`).
- Each extension registers the font at runtime with `CTFontManagerRegisterFontsForURL` in its bundle `init()`, so the family resolves before the first view renders.
- The widget's `lockScreenBackground()` returns the view unchanged on iOS 16 (it no longer returns an empty view).
- The app writes the App Group snapshot with `colorMode` (ADR 0054), which the widget tap intent now carries forward.

## Consequences

- **Positive:** the production Android build no longer needs a Firebase file; the Data safety form matches the bundled SDKs; the watch shows data from the phone; the Android manifest carries no unused permissions; each extension declares its own privacy reasons.
- **Negative:** push needs Firebase re-added later (a small, documented change). The Swift changes cannot be compiled on Windows; they are checked on a Mac build before release.
- **Open:** the iPhone side of the `seq` dedupe is not changed in this ADR; a watch that loses its `UserDefaults` restarts from 0.

## Alternatives considered

- **Keep Firebase for future push.** Rejected: it blocks the build today and v1 sends no push.
- **Share App Group storage between the phone and watch.** Rejected: App Groups do not cross devices; WatchConnectivity is the supported path.
- **One privacy manifest for the whole app.** Rejected: each extension is its own bundle and needs its own declaration.

## Decisions that need the developer

None for this ADR. The Settings privacy row (§4) is recorded as an approved difference from `#Settings`.
