# 0094 — Force update on every release: store and OTA

Date: 2026-11-16 · Status: **accepted** (developer, 16 Nov 2026: «Every OTA»). Amends ADR 0060 decisions 2, 4 and 5, and replaces the OTA update strip (spec §13).

## Context

- The force-update pop-up (ADR 0060) did not show in production on iOS. `useForceUpdate` read the route once, when the bootstrap answer arrived. If the person was on any screen above the tabs at that moment, the answer was dropped and nothing retried until the next foreground. Those screens include a reader sheet, the player, a pushed root screen, a notification deep link, or the index route before its redirect lands on `(main)`. The API side was working: `/bootstrap` returned the live store versions (iOS 1.0.3, Android 1.0.2 on 16 Nov 2026).
- The developer wants the pop-up with every release: a new store version, and every OTA update. Before this change an OTA only showed the non-blocking «تحديث جديد جاهز» strip, and the app checked for one on foreground at most every 6 hours.

## Decision

1. **Store releases (unchanged source).** The minimum is still the live store version, refreshed every 15 minutes (`app-stores:refresh`). A store release raises it on its own, with no manual step.
2. **Every OTA blocks.** Once an EAS Update has downloaded (`useUpdates().isUpdatePending`), the same ConfirmDialog shows with «تحديث جديد جاهز» and one button, «إعادة التشغيل», which calls `Updates.reloadAsync()`. The app checks for an OTA at launch (`checkAutomatically: 'ON_LOAD'`) and on every return to the foreground, with no 6-hour limit. A pending store update takes precedence, because an OTA can't fix a binary that is too old.
3. **The answer is kept, not dropped.** The hook keeps the store result in state and decides visibility from the current route on every render.
4. **iOS closes the screens above the tabs.** iOS still can't present a root Modal over a presented sheet. When an update is required and the route is above `(main)`, the hook calls `router.dismissAll()`, and the pop-up shows as soon as the tabs are on screen. Onboarding has no sheets, so the pop-up shows over it directly. Android shows over any screen, as before.
5. **The update strip is removed** from MainShell, along with `useUpdateStrip` and its MMKV check stamp. `UpdateBanner` stays in `src/shared/ui` as a design-system component.

## Consequences

- Every OTA interrupts the person once with a restart. That is the developer's choice: an OTA restart takes about a second, and everyone runs the latest JavaScript.
- On iOS, a forced update closes whatever sheet or pushed screen is open. The reading place is kept (MMKV), so nothing is lost.
- Offline still fails open: no network means no check and no pop-up (ADR 0060 decision 3).
- Release order for store builds is unchanged: the pop-up appears only once the store lists the new version.
