# 0016 — One app for TestFlight and the store

Date: 2026-10-28 · Status: accepted · Amends spec §13 (environments) and the content plan (release pipeline)

## Context

Spec §13 had three app variants: `.dev`, `.preview` and production, with the preview variant (staging API, QF prelive keys) going to TestFlight. That needs a second App Store Connect record and a second bundle ID for the same app.

## Decision

1. **One App Store app**, `com.taybahapp.taybah` (App Store Connect Apple ID 6828097265). TestFlight and store builds both come from the `production` EAS profile.
2. The `preview` variant, profile and channel are removed. `development` stays for local development builds; it never reaches App Store Connect.
3. The production profile reads `EXPO_PUBLIC_API_URL` from the EAS `production` environment, so the API it points at changes without a code change: staging until the production server exists, production after.

## Consequences

- Early TestFlight builds run against staging and QF prelive keys under the production bundle ID. Builds made before the switch keep the staging URL until testers update.
- One set of credentials, one store record, one push identity.
- A TestFlight build and the store build cannot sit side by side on one device; the `.dev` build still can.
