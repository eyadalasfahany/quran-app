# 0035 — Home-screen and lock-screen widgets, and an Apple Watch app

Date: 2026-11-01 · Status: proposed (needs the developer: see "Decisions that need the developer") · Rests on ADR 0010 (frames first), 0016 (iOS 16.4 stays), 0027 (local-only), 0030 (Salah on device), 0031 (Azkar rights), 0034 (Home, misbaha, daily progress) · Would amend spec §2, §4, §13, §14, §15 and the content plan's version table (edits listed at the end; only the §15 pointer is made now)

## Context

The developer asked (1 Nov 2026) for home-screen widgets on iOS and Android and an Apple Watch app, with clear usage.

What the app already holds, all on the device:
- **Prayer times:** computed by `adhan` in `features/salah/data/prayer-times.ts` (`timesFor`, `nextPrayer`). Notifications are resynced on launch, on foreground when the day, time zone or coordinates changed, and on any edit (`features/salah/data/notifications.ts`, `features/notifications/sync-state.ts`, spec §13).
- **Daily progress:** `useDailyProgress` (goals in MMKV `dailyGoals`, the Khatma wird, Azkar sessions, today's misbaha total).
- **Misbaha:** `features/sibha/data/store.ts` (MMKV `sibha.state`, `sibha.today`), counted by `recordSibhaTap`.
- **Reading place:** MMKV `reader.lastVerseKey`, `reader.lastPage`.
- **MMKV** (`react-native-mmkv` 4.3.2) is the app's preference store (`core/storage/mmkv.ts`).

Constraints from the repository:
- v1 is local-only: no accounts, no sync (ADR 0027). A widget or watch needs no network and must never add one.
- Non-negotiables 1, 3 and 6 (`CLAUDE.md`): Quran text is never altered, no QF data ships in the binary except through packs, no generated religious content. ADR 0031 blocks production Azkar content until OpenDua confirms rights.
- Non-negotiable 7: all UI strings live in `ar.json` / `en.json`. Non-negotiable 5: layout follows window size (a widget has its own size classes, which are the platform's, not a device model).
- The app keeps Expo's iOS 16.4 minimum (ADR 0016). The `.dev` and production variants have different bundle IDs and URL schemes (`app.config.ts`).
- The developer builds on Windows. Android widgets can be built and run on the local emulator (`apps/mobile/android` is generated and git-ignored). iOS widget and watch targets compile only with Xcode (a Mac) or EAS. The developer's rule: no `eas build` without asking.

## Decision

### 1. Rules for every widget, complication and watch screen

1. **No Quran text.** Widgets and the watch show the surah name, the ayah number and the page number only. Nothing renders an ayah. Allowing ayah text later needs a new ADR: it would have to come from the bundled Tanzil text byte for byte, in a Quran font bundled in the extension.
2. **No dhikr text, no generated or selected religious content.** Azkar surfaces show session names (الصباح، المساء…, which are Taybah's display categories, ADR 0031 §9) and counts only. There is no «ayah of the day», no «dhikr of the day».
3. **Deep links go only to routes that exist:** `/read/<verseKey>`, `/salah`, `/sibha`, `/daily-goals`, `/khatma`, `/azkar`, `/azkar/read/<categoryId>`. A widget deep-link allowlist (the same shape as `REMINDER_ROUTE_PREFIXES` in `features/notifications/reminder-deeplink.ts`) ignores anything else. The URL scheme comes from the variant (`taybah://`, `taybah-dev://`).
4. **Offline and local.** A widget or watch never calls our API, QF or any server. Nothing leaves the device except the phone-to-watch link (§3).
5. **Strings:** every string comes from `ar.json` / `en.json` through a `widgets` key group. The app resolves them in the app's language and writes them into the snapshot, so the native code has no string catalog to keep in step. The only native strings are the gallery name and description of each widget (shown before the app ever runs), supplied as `ar` and `en` resources.
6. **Language and direction follow the app's language, not the device's**, as the app does (`CFBundleDevelopmentRegion: 'ar'`). iOS widgets set the SwiftUI layout direction and locale from the snapshot; the numerals are Arabic-Indic in Arabic.
7. **Design:** frames in `quran-app-screens.html` (ADR 0010), from existing tokens. Brand green is the continue-reading card only (as on Home, ADR 0034 §1); other widgets are surface cards. Colours reach Swift through a generated `Tokens.swift` (a script in `packages/design-tokens`, checked for drift like `check:html`), never copied by hand.
8. **Stale data is shown as stale, never guessed.** When the precomputed prayer entries run out, the surface says so and asks to open the app (§4). It never shows a time it did not receive.
9. **Clear-data:** `مسح البيانات` wipes the snapshot and reloads every widget to its empty state.

### 2. Widget set

Frame ids in brackets. Values in frames are mock values.

| Kind | iOS home | iOS lock screen | Android | Tap opens | Notes |
| --- | --- | --- | --- | --- | --- |
| **Next prayer** (name, time, remaining) | small, medium | circular, rectangular, inline | 2×2, 4×2 | `/salah` | iOS remaining time is a system timer (`Text(date, style: .timer)`), so it counts down with no refresh. Android shows the time only (§4). No location: a prompt that opens `/salah`. [`WidgetNextPrayerSmall`, `AndroidWidgets`, `WidgetLockScreen`] |
| **Today's progress** (the daily-goals ring and rows) | small, medium, large | circular (percent only) | 4×2 | `/daily-goals` | Rows are only the goals the user chose (ADR 0034 §5). Nothing chosen: a «حدّد أهدافك» state. [`WidgetProgressMedium`] |
| **Continue reading** (surah, ayah, page, plus the Khatma wird line) | small, medium | none | 2×2, 4×2 | `/read/<verseKey>` | The only green card. The wird line shows only with an active Khatma plan. No ayah text. [`WidgetContinueReading`] |
| **Misbaha** (count and target ring) | small | none | 2×2 | `/sibha` | The «+» counts one tap without opening the app (§3.3). Reset is in the app only. [`WidgetContinueReading`, `AndroidWidgets`] |
| **Azkar status** (five sessions, done or not) | medium | none | none in the first release | `/azkar` | **Gated:** compiled into the binary only when `AZKAR_WIDGET=1` in the build environment (§7). [`WidgetContinueReading`, bottom row] |

Khatma wird has no widget of its own: it is a line in Continue reading and a row in Today's progress, so the gallery stays small (five kinds, one of them gated).

Lock-screen privacy: the lock-screen set shows prayer and the progress percent only. The reading place and the misbaha count never appear on a locked device.

### 3. Apple Watch

**Scope.** A watchOS companion app (SwiftUI) and WidgetKit complications. Wear OS is out of scope.

| Screen | Content | Frame |
| --- | --- | --- |
| Next prayer (home) | name, time, remaining (timer), page dots | `WatchHome` |
| Today's prayers | the five times, the next one shaded | `WatchHome` |
| Today's progress | the daily-goals ring and the goal rows | `WatchHome` |
| Azkar status | session rings, done or not. **Gated, read-only** | `WatchHome` |
| Empty and stale states | «افتح طيبة على الآيفون»; stale prayers show no time | `WatchHome` |
| Misbaha | tap anywhere (or Double Tap) to count; light haptic per count, a distinct one at the target; target ring, round number; target picker (33, 99, 100, custom by Digital Crown); today's total; reset with confirmation | `WatchSibha` |
| Complications | `accessoryInline`, `accessoryRectangular`, `accessoryCircular`, `accessoryCorner` | `WatchComplications` |

**Data flow (WatchConnectivity, phone to watch and back; the watch never calls our API or QF):**
1. **Phone → watch, the latest state:** `updateApplicationContext` with the snapshot of §4 (prayer entries for the next 48 h or more, progress, misbaha target, labels, locale). The latest value wins; it is delivered when the watch next wakes. The watch stores it in its own container and reloads its complication timelines.
2. **Watch → phone, misbaha counts:** `transferUserInfo` (queued, ordered, survives the app being closed) with `{ source: 'watch', installId, seq, date, taps }`. The phone merges it idempotently: it keeps the last `seq` per `installId` and ignores anything at or below it.
3. **Merge rule:** a delta is added to **today's total** only when its `date` is today's local date; an older one is dropped (the phone keeps no per-day history). The watch has its **own** current count and target, so the phone's counter and the watch's counter never fight; only the daily total is shared. Reset on the watch changes nothing on the phone. (The alternative, one shared live counter, needs two-way real-time sync and conflict rules and is rejected for the first release.)
4. **Offline-first:** the watch works with no phone nearby from its last context: counting is local and queues; prayer entries run out only after the horizon (§4).
5. **The widget «+» on the phone** uses the same idea: a monotonic `widgetTapsTotal` the extension increments and the app reads against its own `lastMergedWidgetTaps`. The extension is the only writer of one number, the app the only writer of the other, so nothing is lost on a crash and nothing counts twice. Unlike the watch, a widget tap advances the phone's own counter and today's total (`recordSibhaTap` rules, including the target).

**Haptics:** `WKInterfaceDevice.current().play(.click)` per count, `.success` at the target. **Double Tap** (`handGestureShortcut(.primaryAction)`, watchOS 11 and a supporting watch) is an enhancement, not a requirement.

### 4. Data sharing and refresh

**iOS.** The app writes one small JSON file, `widgets/snapshot.json`, into the **App Group container** (`group.<bundle id>`, so `group.com.taybahapp.taybah` and `group.com.taybahapp.taybah.dev`) through `@bacons/apple-targets`'s `ExtensionStorage`, then asks WidgetKit to reload (`WidgetCenter.reloadAllTimelines()`). The widget and watch targets only read it. The group name is permanent once data is shared; it is derived from the variant in `app.config.ts`.

**Android.** There is no second store. `react-native-android-widget` renders in the app's own JS runtime (a headless task when the app is closed), so the widget code calls the same snapshot builder over MMKV `quran-prefs`. SharedPreferences is needed only if a native Kotlin provider is added later (cut line, §7).

**The snapshot** (schema version 1; widgets ignore unknown fields and show the open-the-app state for an unknown major version):

```json
{
  "schemaVersion": 1,
  "writtenAt": 1793558400000,
  "locale": "ar",
  "labels": { "nextPrayer": "…", "openApp": "…" },
  "prayer": {
    "place": "…",
    "entries": [ { "key": "fajr", "at": 1793580000000 } ],
    "validUntil": 1793731200000
  },
  "progress": { "percent": 60, "rows": [ { "key": "wird", "label": "…", "value": "…", "done": false } ] },
  "reading": { "verseKey": "2:255", "surah": "…", "ayah": 255, "page": 42 },
  "wird": { "done": 4, "target": 10 },
  "misbaha": { "count": 33, "target": 100, "todayTotal": 150, "widgetTapsTotal": 0 },
  "azkar": null
}
```

- `prayer.entries`: every prayer instant (sunrise excluded, like `NextPrayerName`) for today and the next two days, computed by `timesFor` for each date. That is 15 entries and at least 48 h from any moment on the first day. `validUntil` is the last entry. No coordinates are written; `place` is a display name or null.
- `azkar` is `null` unless `useAzkarAvailable()` is true; then it holds `{ sessions: [{ id, done, total, complete }] }`. It never holds dhikr text.
- Strings in `labels` and the numerals in text values are produced by the app, in the app language.

**Writers and triggers.** One function, `syncWidgets()`, builds the snapshot and writes it. It runs on the triggers the prayer-notification sync already uses (launch; foreground when the day, time zone or coordinates key changed; location, method or city change) and on the data changes widgets show: goals edited, a Khatma log, an Azkar item or session change, the reading position saved (on leaving the reader, not per page turn), and the app going to the background. **A misbaha tap never triggers a write by itself:** the write is debounced to when the counter screen closes or the app backgrounds, so counting does not spend WidgetKit's reload budget.

**Refresh strategy.**
- **iOS:** the timeline provider builds one entry per prayer instant from the snapshot and uses `.atEnd`. Name and time change at each prayer with no background work. The remaining time is a system timer. A reload from the app costs one budgeted refresh. About six timeline refreshes a day are needed.
- **Watch complications:** the same, from the context the watch stored.
- **Android:** no timelines exist on Android. The widget renders "next prayer" from the snapshot's entries at render time, `updatePeriodMillis` is 30 minutes (the platform floor, per the library docs), and the app requests an update on the same triggers. Between updates the prayer name can lag at most one update period after a prayer time passes; the widget shows the time, not a countdown, so it is never wrong about the time. A true ticking countdown needs a native Kotlin provider with a `Chronometer` (cut line).
- **Expiry:** past `validUntil` every surface shows the stale state and no time.

**Privacy (ADR 0027).** The snapshot never leaves the device except to the paired watch. The iOS App Group is shared only with this app's own extensions. Android MMKV is private to the app. No analytics, no network, no new permission. Location is read only where it already is (Salah); a widget never asks for it.

### 5. Tooling (verified 1 Nov 2026)

| Option | Version, last release | Covers | Verdict |
| --- | --- | --- | --- |
| `expo-widgets` | 58.0.26, 31 Oct 2026 (SDK 58 line, MIT, depends on `@expo/ui` ~58.0.26) | iOS widgets, Live Activities, **Android widgets** (opt-in) from TypeScript | **Not chosen.** |
| `@bacons/apple-targets` | 5.0.0, 17 Jul 2026 (repo pushed 31 Oct 2026; MIT; `expo` ≥ 52; needs Xcode 16 and CocoaPods 1.16.2) | iOS widget, `watch` app and `watch-widget` complication targets, App Group `ExtensionStorage`; the Swift is hand-written | **Chosen for iOS and watchOS.** |
| `react-native-android-widget` | 0.26.0, 29 Oct 2026 (MIT; `expo` ≥ 54; four releases in ten days) | Android widgets from React primitives, `OPEN_URI` click action, task handler in the app's JS | **Chosen for Android.** |
| `react-native-watch-connectivity` | 2.0.0, 20 Mar 2026 (MIT; React Native 0.76+) | `WCSession` from JS (context, user info, messages) | **Chosen for the phone side of the watch link**, subject to the spike below. |

Why not `expo-widgets`, from its SDK 58 documentation (read 1 Nov 2026):
- Widget code runs in an isolated runtime: no hooks, no async work, no imports, no module-level constants; data arrives only as props. That fits a snapshot, but it limits layout code reuse.
- iOS widgets are built from `@expo/ui/swift-ui` components, and the docs do not document a tap deep link for home-screen widgets (only Live Activities and notifications have a `url`). Our Continue-reading tap needs `/read/<verseKey>`.
- Android widgets support 19 Compose components and 12 modifiers, no timelines, and an environment that gives only the colour scheme.
- It has no watchOS app target (a Live Activity's `bannerSmall` is the only watch mention), so the watch needs `@bacons/apple-targets` anyway; two systems writing App Group and extension targets in one project is a conflict risk.
- The docs do not say anything about custom fonts or right-to-left layout in widgets. The frames need Amiri and an app-language layout direction, so this is unproven.

Its advantage is real: it is first-party and aligned with SDK 58. **Revisit at SDK 59** (or when it documents widget deep links and custom fonts); the snapshot (§4) is independent of the tool, so the switch would replace the native layer only.

Why `@bacons/apple-targets` for iOS: hand-written SwiftUI gives `widgetURL` / `Link`, `Text(date, style: .timer)`, bundled fonts, `.environment(\.layoutDirection)`, accessory families, `AppIntent` buttons (iOS 17), and a `watch` and `watch-widget` target in one config, with the targets kept outside `ios/` so prebuild stays clean (CNG). Risk: single maintainer, 72 open issues, and the README says its Xcode parsing is "possibly full of bugs" and that EAS signing was tested end to end on one project. Mitigation: a spike on EAS or a Mac before anything else is built on it (plan step 6).

Why `react-native-android-widget` for Android: it is the only candidate that supports click actions to a deep link (`OPEN_URI`), arbitrary React-primitive layouts with the app's tokens and fonts, and a handler in the app's own runtime that shares MMKV and the snapshot builder. Risks, all tested in the plan's step 3 spike before the dependency is kept: its Limitations page says layouts are rendered to an image sized to the widget (TalkBack labels, sharpness and RTL need a check), widget size is calibrated on first click on some launchers, a closed app must start a headless runtime to render, and the maintainer ships fast (pin the exact version, review the changelog on each bump). The fallback is `expo-widgets` Android with the same snapshot, then a native Kotlin provider.

Why `react-native-watch-connectivity`: the alternative is a local Expo module in Swift. The library is current (2.0.0, March 2026) and avoids our own native code. Spike: confirm it builds on React Native 0.88 with the new architecture, and that user-info transferred while the phone app is **killed** is delivered at next launch with nothing lost. If it fails, a small local Expo module replaces it.

New-dependency rule (`CLAUDE.md`): each has a release in the last 12 months. None is in the content plan's version table, which wins on versions: each approved package gets a row (exact pin, reason) in the same change that installs it. Run `node .github/scripts/npm-audit.mjs` after install. The agent rules forbid agents adding dependencies, so the developer installs or approves each.

### 6. Build constraints

- **Android** (local, Windows): `npx expo prebuild -p android` and `npx expo run:android` on the emulator. Widgets are added from the launcher's widget picker. Deep links are testable with `adb shell am start -a android.intent.action.VIEW -d taybah-dev://…`.
- **iOS and watch** (Mac or EAS only): the widget, watch and complication targets compile only with Xcode 16+ or EAS. Swift written on Windows is unverified until then. Each iOS and watch step therefore ends with a gate: a compile and a simulator screenshot against the frame, on a Mac or on an EAS build **the developer approves for that step**. Nothing in this plan runs `eas build` by itself.
- To keep the Swift small and checkable on both sides, the plan shares **golden JSON fixtures** between Jest (TS builder) and XCTest (Swift decoder and timeline).
- **Apple Developer setup** (needs the paid account, done by the developer or by EAS credentials with approval): the App Group on the app, the widget extension, the watch app and the watch extension, for both bundle IDs.
- App Store: a watch app ships inside the iOS app; it needs Apple Watch screenshots and review notes (spec §14 release checklist).

### 7. Delivery order and cut lines

Order: **frames approved → platform-neutral snapshot module (testable on Windows) → Android spike and widgets (local) → tokens to Swift → iOS widgets → watch app → complications → usage help → exit check.**

Cut lines, lowest priority first:
1. Android large (4×4), iOS large (kept only if the medium rows prove too tight).
2. The Azkar status widget and the watch Azkar screen (also gated by ADR 0031; compiled in only with `AZKAR_WIDGET=1` until the OpenDua blockers clear, because a gallery entry with no content is a dead end, ADR 0017).
3. The interactive misbaha widget tap (the widget then opens `/sibha`).
4. `accessoryCorner` and the second complication face.
5. The watch's target picker (fixed 33/99/100 chips).
6. All of iOS and watchOS (Android-only first release). A native Kotlin countdown provider is a v1.1 item.

**Where it sits in the delivery plan:** spec §15 carries a pointer to this as a **proposed follow-up**, not a phase. It needs the developer's call (decision 9).

### 8. Usage

"Clear usage" means the user is told how to add and use each surface. Proposed: a **«الودجات والساعة»** row in Settings that opens a help sheet with the steps per platform (add a widget from the home screen or lock screen; install the watch app from the Watch app on the iPhone; what each widget does and what it never shows). It needs a frame and the developer's approval of the entry point before any code (decision 7). Store pages and the first-run need no change.

## Decisions that need the developer

1. **Approve the widget set, the exclusions and the frames** (ADR 0010): five kinds, no Quran text, the lock screen without reading place or counts.
2. **Tools and dependencies:** `@bacons/apple-targets` 5.0.0 (iOS and watchOS), `react-native-android-widget` 0.26.0 (Android), `react-native-watch-connectivity` 2.0.0 (phone side of the watch link), instead of `expo-widgets`. Each spike can reject its tool.
3. **Watch scope and minimum OS:** companion app and complications, no Wear OS; watchOS 10 (more watches) or 11 (the plugin's default, supports Double Tap).
4. **Misbaha behaviour:** the widget «+» counts without opening the app; the watch keeps its own count and only adds to today's total. Or: widget opens `/sibha`, or one shared live counter.
5. **Android prayer widget:** time only, no countdown (recommended); or accept a coarse relative text that can lag up to 30 minutes.
6. **Azkar surfaces:** ship the Azkar widget and the watch Azkar screen only in builds with `AZKAR_WIDGET=1` until ADR 0031's blockers clear; the watch screen is read-only status.
7. **Navigation:** a Settings row «الودجات والساعة» with a help sheet (needs a frame), versus no in-app help.
8. **Apple setup and builds:** the App Group names (`group.<bundle id>`), permission to register them, and which route compiles iOS and watch targets: a Mac, or an `eas build` that you approve each time.
9. **Schedule:** before beta (Android only first), as a post-launch v1.1 item (recommended: it adds iOS targets that cannot be compiled on this machine), or dropped.
10. **Lock-screen privacy:** confirm prayer and progress percent only on the lock screen.

## Consequences

- The snapshot builder, the tap-merge rule and the deep-link allowlist are platform-neutral TypeScript, written and tested on Windows, and independent of the tool chosen.
- Widgets add one source of truth: the snapshot. A prayer time is never recomputed natively, so a widget time equals the app time.
- `app.config.ts` gains an App Group entitlement and config-plugin entries per variant. `apps/mobile/targets/` gains Swift. `packages/design-tokens` gains a Swift generator.
- A native change: it ships in a store build, never over the air (`expo-updates`).
- Watch and widget code cannot be compiled on this machine; the Mac or EAS gate is a schedule risk.

### Release blockers (for the widgets and watch release only)

1. The developer approves this ADR and the frames.
2. Each dependency approved, rowed in the content plan, audited; the Android spike passes (RTL, TalkBack labels, `OPEN_URI`, closed-app rendering).
3. The iOS and watch targets compile and pass their screenshot review on a Mac or an approved EAS build; the App Group and extensions exist for both bundle IDs.
4. Widget and watch times equal the app's across a DST change and a time-zone change (golden fixtures).
5. The watch misbaha test: counts made with the phone app killed reach today's total once, never twice.
6. «مسح البيانات» clears the snapshot and the widgets show their empty state.
7. Azkar surfaces absent from builds until ADR 0031's blockers clear.
8. The fonts bundled in the extensions have their licences recorded in the content plan.
9. App Store: watch screenshots and review notes; the privacy label is checked (no data is collected).

## Spec edits this implies (not made yet, except §15)

- §15: a pointer to this ADR as a proposed follow-up (made).
- §2: the diagram's "Device" box gains the widget and watch extensions reading the snapshot.
- §4: `targets/` (Swift) and `src/features/widgets/` in the tree.
- §13: the snapshot sync triggers beside the notification sync.
- §14: widget and watch rows in the device matrix (iPhone SE-size and Pro Max, iPad widgets, Android phone, foldable, tablet, Apple Watch 41 mm and 49 mm) and the lock-screen and complication checks.
- Content plan: version rows for each approved package.
