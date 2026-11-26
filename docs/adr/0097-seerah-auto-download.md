# 0097 — Download the Seerah pack automatically

Date: 2026-11-26 · Status: **accepted** (developer, 26 Nov 2026), including decision 7: the developer approved the redrawn `SeerahStateDownloading` frame, without Cancel, the same day (ADR 0087). Plan: `docs/plans/seerah-auto-download.md`. This ADR amends ADR 0091 decision 2 («download sheet»). ADR 0091 is itself still Proposed.

## Context

- The developer wants every user to get the Seerah pack with no tap (26 Nov 2026).
- Until now the Seerah screen showed the «تنزيل السيرة» card (frame `SeerahStateDownload`, about 0.2 MB) until the user tapped it.
- The tap installs the pack on demand. `useHadithDownloads.start` calls `installResource`, and `keepOnDemand` then keeps the pack. After that, sync keeps it and updates it like any installed resource.
- Azkar and Duas install with no user choice through sync selection (`AUTO_SELECTED_PACK_GROUPS`, ADR 0031 §9, ADR 0044). Moving Seerah onto that route would bring three problems:
  1. **304 trap.** The manifest ETag is a hash of the body. A device that stored it while Seerah was already listed gets `304` and never installs.
  2. **Temp-path race.** Sync's pack import bypasses the on-demand `inFlight` map and uses the same temp path, so a tap during the first sync can race it.
  3. **No progress.** Sync reports no progress, so the downloading card's bar could not fill.

## Decision (developer, 26 Nov 2026)

1. **The app starts the existing on-demand Seerah install itself:**
   - after every content sync run settles, successful or not;
   - when the Seerah screen opens.

   The trigger acts only when all of these hold: the synced catalogue lists Seerah, it is not installed, and no install of it is running. It reacts to these two events only, never to catalogue version bumps.
2. **Seerah is not added to sync's auto-selected groups.**
3. **Every user gets it:** new installs, and existing users who never downloaded it.
4. **Seerah installs over any network**, like Azkar and Duas. The Wi-Fi-only setting keeps applying to hadith and audio.
5. **Updates stay automatic** through the on-demand list and the change feed. This needs no new code.
6. **The pack is not removable**, like Azkar and Duas.
7. **No Cancel.** The downloading card has no Cancel button, and the auto-download always proceeds. The redrawn `SeerahStateDownloading` frame was approved on 26 Nov 2026.
8. **Screen states:**
   - The manual download card is no longer reachable, and its frame `SeerahStateDownload` is retired (developer, 26 Nov 2026): removed from `screens/` and from `design/` by the rebuild. An idle, listed, not-installed pack shows as downloading at 0, because the install starts at once.
   - Offline and Error stay, each with its retry.
9. **Unpublished pack.** While the Seerah pack is not published (production refuses `seerah:import` without `--release`, ADR 0091), the manifest does not list it and the trigger does nothing.

## Consequences

- There is no API, contract, schema or dependency change. The release is an EAS Update.
- Users see no effect until the Seerah content gate passes and the pack is published (phase-8 steps 21 and 26).
- A pack that always fails is retried after each sync settle or screen open, at about 0.2 MB each time.
- A user on a metered connection cannot stop the 0.2 MB download.
- One narrow race already exists and is recorded in the plan, not fixed here: a sync that lands between `importPack` and `keepOnDemand` can remove the pack just installed. The next trigger reinstalls it.
- The spec (§7 hop 3) needs a line naming this install path. The plan gives the wording; it is applied when the spec is free.
