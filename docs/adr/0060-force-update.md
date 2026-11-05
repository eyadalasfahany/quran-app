# 0060 — Force update: a blocking pop-up below the API's minimum version

Date: 2026-11-05 · Status: **proposed** · Branch: `main` · Rests on ADR 0022 (Railway service variables), ADR 0034 (ConfirmDialog for in-app confirmations); the offline rule is non-negotiable 4 in `CLAUDE.md`

## Context

Some releases break the API contract or fix a bug that must not stay in the field. Until now the developer had no way to stop an old install other than asking people to update. The store update is the only fix, and the app has to tell an old install that a newer one exists.

Two constraints shape the design. Launch must never wait for the network (offline-first: every tap works without it, and Quran reading must keep working offline). And the stores approve iOS and Android releases at different times, so one number can't serve both.

## Decision

1. **The API returns the minimum version and store link per platform.** `GET /api/v1/bootstrap` (the first slice of the endpoint in spec §9; other fields stay planned and are additive) returns `min_app_version.{ios,android}` and `store_url.{ios,android}`, from `MIN_APP_VERSION_IOS`, `MIN_APP_VERSION_ANDROID`, `APP_STORE_URL` and `PLAY_STORE_URL` (defaults in `config/mobile_app.php`). Per platform, because the stores approve releases at different times. An empty minimum means no force update. The route is `no-store`, so a change applies on the next check.
2. **The app checks after the splash and on each foreground, and never blocks launch.** The check runs in the background (`useForceUpdate`), and `ForceUpdateGate` renders only once the splash has finished. It compares `expo-application`'s native version, not `Constants.expoConfig.version`, because an EAS Update's manifest can carry a newer version than the installed binary. It compares the marketing version (`version` in `app.config.ts`), not the build number, so the minimum is written the way a release is named.
3. **Any failure fails open.** A network error, an API error, or a version text that isn't dotted digits shows nothing (`isUpdateRequired` returns false). The requirement is not stored on the device: with no network the person can't update anyway, and reading must keep working offline. So someone offline is not blocked.
4. **The pop-up is the one-button notice from ConfirmDialog (ADR 0034).** It has no cancel. The scrim and Android back do nothing, so the only way forward is the store link.
5. **iOS limit.** React Native presents a root Modal from the root view controller, and that fails silently while a sheet is presented. `router.canDismiss()` can't tell a sheet from a pushed screen, so on iOS the pop-up is held back while either is open. The next foreground or launch tries again. Android is not affected and shows the pop-up over any screen.
6. **Release order.** Publish the new version in the store, wait until it is live, then raise the variable. Raising it earlier sends people to a store page with no newer version. In production the variables are Railway service variables (ADR 0022); `entrypoint.sh` runs `config:cache`, so a change takes effect on redeploy. On a plain `.env` server, run `php artisan config:cache` after an edit.

## Consequences

- A forced update is a deliberate act with a delay: the variable moves only after the store release is live.
- Someone who never goes online after the variable is raised keeps the old app. That is the cost of offline-first. Anyone online sees the pop-up at the next launch or foreground.
- On iOS the pop-up can be late: while a sheet or pushed screen is open it waits for the next foreground or launch.
- The bootstrap response grows additively. The spec's other fields (feature flags, Hijri date, daily hadith id) stay planned.
- No new screen, no new design frame. The copy lives in `forceUpdate` in both locale files.

## Alternatives considered

- **Check on the splash and block until the answer arrives.** Rejected: it breaks launch for anyone on a slow or no network (non-negotiable 4).
- **Store the requirement on the device and enforce it offline.** Rejected: a person offline can't update, so blocking them only stops reading. It also means a stale flag could lock someone out after the variable is lowered.
- **One minimum for both platforms.** Rejected: the stores approve at different times.
- **Compare `Constants.expoConfig.version`.** Rejected: an EAS Update can ship a newer manifest version than the installed binary, so the comparison would say "up to date" for a binary that is not.
- **A dedicated update screen with its own frame.** Deferred: the one-button ConfirmDialog already fits the notice, and a new frame needs the developer's approval first (see below).
- **Use the store's in-app update API.** Not used: it cannot be made blocking on both platforms and depends on store policy.

## Decisions that need the developer

1. **Approve using the existing ConfirmDialog for the pop-up, without a dedicated frame in `quran-app-screens.html`.** The copy is in `forceUpdate` (ar and en). If approved, no design change is needed. If not, a frame must be drawn and approved before the screen is built, per ADR 0010.
2. **Approve the iOS limit (decision 5).** The pop-up is held back while a sheet or pushed screen is open, so a person on one of those screens sees it only at a later foreground or launch.
