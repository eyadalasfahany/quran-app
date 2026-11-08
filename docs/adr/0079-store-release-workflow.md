# 0079 — Store release workflow with What's New

Date: 2026-11-08 · Status: **Proposed** (the developer chose automatic App Store release and Play production at 100% on 8 Nov 2026; the rest of the design awaits their acceptance) · Amends `docs/content-plan.md` «Release pipeline» (Play rollout: staged 10% → 50% → 100% becomes production at 100%). Runbook: `docs/runbooks/store-release.md`.

## Context

Spec §14 planned `eas build` and `eas submit` on `mobile-v*` tags, but `mobile.yml` never had those jobs. Each store release was done by hand: build, upload, What's New in two languages on two stores, the review submission and the Play rollout.

Two tools do not cover this on their own:

- EAS Submit uploads the binary, but has no release-notes field and never submits an iOS build for review.
- EAS Metadata sets App Store metadata only, not Play, and its App Store fields do not cover What's New plus review in one step.

So the release uses four tools, each for one job.

## Decision

1. **EAS Build** builds iOS and Android with the `production` profile.
2. **EAS Submit** uploads the iOS build to App Store Connect. It runs on Expo's servers, so a Linux runner is enough.
3. **fastlane `deliver`** sets the App Store What's New (`ar-SA`, `en-US`) on that build, submits it for App Review with automatic release. Name, description and screenshots are not touched.
4. **fastlane `supply`** uploads the AAB and sets the Play What's new (`ar`, `en-US`) in one edit on the `production` track at 100%, sent for review. An uncommitted edit publishes nothing, so a failed step leaves no half-released version.
5. **Notes live in the repo**: `infra/store-release/release-notes/<version>/{ar,en}.txt`, one folder per version. Before any build, `.github/scripts/release-notes-check.mjs` requires the tag to equal the version in `app.config.ts`, both files to exist and be non-empty, at most 500 characters (Play's limit; the App Store allows 4000), no platform or store names, and no Quran script (App Store Connect rejected Uthmani text, `docs/runbooks/store-listing.md`).
6. **fastlane lives in `infra/store-release/`**, not in `apps/mobile`. A Gemfile in the Expo project root would change EAS iOS builds and possibly the runtime fingerprint, which would break OTA updates (`apps/mobile/CLAUDE.md`, «Releasing»).
7. **Play goes to production at 100%** with `release_status: completed`, no staged rollout. This amends the content-plan rollout note.

Workflow: `.github/workflows/mobile.yml`. The `checks` job runs first on every tag, then `build` (validation, then EAS), then `ios` and `android` in parallel. Tag runs never cancel an earlier run.

## Consequences

- Five GitHub secrets are needed: `EXPO_TOKEN`, `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8` and `PLAY_SERVICE_ACCOUNT_JSON`. The EAS Submit App Store Connect key is stored in EAS, not in GitHub.
- The repo is public, so workflow logs are public. The AAB download URL appears in the log. That is acceptable: the AAB is the published app. No secret is printed.
- The first end-to-end run is untested. Expect the first tag to need fixing.
- If `ios` fails after `eas submit` succeeded, re-running the job re-uploads the same build number and fails. Run the fastlane lane by hand instead (runbook, recovery).
- fastlane pins: `fastlane` 2.241.2 in `infra/store-release/Gemfile.lock`, Ruby 3.4. Upgrades are a reviewed change to that lockfile.
- The `ios` lane waits for Apple to finish processing that exact build (up to 60 minutes) before it sets What's New and submits; deliver alone does not wait when given a build number.
- Automatic release means that once Apple approves, the build goes live with no further step. The developer has chosen this (8 Nov 2026).
