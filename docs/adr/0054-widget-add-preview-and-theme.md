# 0054 — Widget add preview, destination choice, and app theme in the snapshot

Date: 2026-11-03 · Status: **accepted** (developer, 3 Nov 2026; **amended** 3 Nov 2026 evening — Android lock destination) · Amends [0035 — widgets and watch](./0035-widgets-and-watch.md) §1.7, §4, §8 · Rests on ADR 0010, 0035, 0053

## Context

After the first widgets ship (ADR 0035), the developer asked to:

1. Review every widget (content, frames, tap targets).
2. Show an in-app confirmation that previews the widget design before the user adds it (`ConfirmDialog` / design system, not `Alert.alert` — `apps/mobile/CLAUDE.md`).
3. Avoid adding the same widget again when it is already on the home or lock screen.
4. Let the user choose **home vs lock** destination and use the **app theme** (MMKV appearance), not only the system light/dark scheme.

**Current code (before this ADR):**

- Native widgets pick palette from **system** `colorScheme` (iOS: `apps/mobile/targets/widget/_shared/WidgetViews.swift`; Android: dual light/dark trees in `render.tsx`, `theme.ts`).
- App appearance lives in MMKV (`storageKeys.appearance`, `resolveThemeName` in `apps/mobile/src/core/theme/appearance.ts`).
- Android pin is direct: `WidgetPinButton` → `requestPinWidget` (`react-native-android-widget`). No preview step.
- Discover «أضف الودجت» uses `DiscoverWidgetSheet` (bottom sheet, ADR 0053) with help copy only — not a per-widget preview.
- Deep links are allowlisted in `features/widgets/snapshot/deep-links.ts` and covered by `deep-link-routes.test.ts`.
- iOS cannot programmatically add home or lock widgets; Android `requestPinWidget` is home-screen only.

## Decision (accepted 3 Nov 2026)

### 1. Add flow UI

- **Preview confirmation** uses the shared **`ConfirmDialog`** pattern (`src/shared/ui/ConfirmDialog.tsx`), with a **widget preview** region inside the card (not a second bottom sheet). Frames in `quran-app-screens.html`: `WidgetAddConfirm`, `WidgetAddConfirmDark`, `WidgetAddConfirmAlready`, `WidgetAddConfirmAlreadyDark` (Arabic; English variants as review items). **`WidgetPreviewMock`** for next prayer uses `Date.now()` and the same lines as the Android 2×2 / iOS small widget (name, muted clock, static remaining — ADR 0035 decision 5 amended 3 Nov 2026); it never hard-codes a clock time.
- **Primary confirm** means «متابعة» / continue to add:
  - **Android home:** call `requestPinWidget` for the selected provider after confirm (and optional duplicate check).
  - **Android lock:** confirm dismisses into **numbered steps** (`widgetsHelp.androidLock.*`); do **not** call `requestPinWidget` (home-screen pin only).
  - **iOS:** no pin API — confirm dismisses into **numbered steps** (reuse `widgetsHelp.ios.*`) scoped to the chosen **kind** (home small/medium vs lock accessory family).
- **Discover** and **Settings → الودجات والساعة** share one **`WidgetAddConfirmDialog`** component (and catalog metadata).

### 2. Destination (home vs lock)

- **iOS:** destination maps to **WidgetKit kind** (ADR 0035 §2 table): e.g. Next prayer home (`NextPrayerSmall`) vs lock (`LockScreenPrayer`, `LockScreenPrayerCircular`). Progress lock uses `LockScreenProgress` only (privacy: percent only, decision 10 in 0035).
- **Android:** **home and lock** for catalog entries that list lock (next prayer, progress only — ADR 0035 lock privacy). Providers that support lock use `widgetCategory: 'home_screen|keyguard'` (Android 16 QPR2+ lock widgets). **Home:** `requestPinWidget` after confirm plus duplicate `getWidgetInfo` check as today. **Lock:** post-confirm **steps** only; the user adds from the **lock-screen widget gallery** (`requestPinWidget` is home-only).
- **Default destination** (home vs lock) is stored in MMKV (`widgets.addDestination`) for the next add flow; it does not change OS placement by itself.

### 3. App theme in widget rendering

- Snapshot gains `colorMode: 'light' | 'dark'` — the **resolved** widget palette from `resolveThemeName` at `syncWidgets()` time (automatic, forced light/dark, and **dark after Maghrib**).
- **Sepia maps to `light`** on widgets only (no sepia palette in extensions). Documented here; no `sepia` value in `colorMode`.
- Schema: keep `schemaVersion: 1`; widgets ignore unknown fields (0035 §4). Older snapshots without `colorMode` fall back to system appearance until the next sync.
- iOS Swift reads `snapshot.colorMode` instead of `@Environment(\.colorScheme)` for Taybah card surfaces (system vibrant/tinted modes may still apply on lock accessories).
- Android: render using `colorMode` from the snapshot (one resolved palette per update).
- Changing appearance in Settings triggers `syncWidgets()` so placed widgets update on next reload.

### 4. «Already added» UX (honest platform limits)

- **Never claim** the app knows every widget on the lock screen (iOS: **no API**).
- **Android home:** best-effort check via `AppWidgetManager.getAppWidgetIds` for the selected provider before `requestPinWidget`. When IDs.length > 0, show ConfirmDialog state «موجود بالفعل» with **تم** / **إضافة على أي حال**.
- **Soft memory:** MMKV flag after successful pin — copy hint only, not proof the widget still exists.
- **iOS:** after confirm, steps only; copy may note that an existing widget can stay; no blocking detection.

## Consequences

- Snapshot fixtures and Swift `Snapshot.swift` gain optional `colorMode`.
- New UI under `features/widgets/components/` with colocated tests.
- `docs/plans/widgets-watch.md` steps 11–19.

## Release blockers (this ADR)

1. `WidgetAddConfirm*` frames approved (accepted with this ADR; visual gate still runs in step 19).
2. Steps 14–18 implemented; step 11 audit and step 19 exit check pass.
3. No marketing copy implies lock-screen detection or iOS one-tap add.

## Spec edits

- §4 / snapshot pointer: `colorMode` in widget snapshot (0035/0054).
- §14 matrix: widget add confirm + theme mismatch (app dark vs system light).
