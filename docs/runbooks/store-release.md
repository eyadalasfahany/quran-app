# Store release runbook

How a `mobile-v<version>` tag ships Taybah to the App Store and Google Play. Decision and reasons: `docs/adr/0079-store-release-workflow.md`.

## (a) One-time setup

GitHub secrets (Settings → Secrets and variables → Actions). Add each one from a file so the value never appears in the shell history:

```bash
gh secret set NAME < file
```

| Secret | Where to get it |
| --- | --- |
| `EXPO_TOKEN` | expo.dev → Access tokens |
| `ASC_KEY_ID` | App Store Connect → Users and Access → Integrations → App Store Connect API. Role App Manager |
| `ASC_ISSUER_ID` | Same page, the Issuer ID |
| `ASC_KEY_P8` | The `.p8` key file from the same page. Paste the whole file content, including the BEGIN and END lines |
| `PLAY_SERVICE_ACCOUNT_JSON` | A Google Cloud service account JSON key. Invite the service account in Play Console → Users and permissions, with release-to-production permission for Taybah |

EAS Submit key (used by `eas submit`, stored in EAS, not in GitHub):

```bash
cd apps/mobile && npx eas-cli credentials -p ios
```

Choose the production profile → App Store Connect API Key. If none is set up for EAS Submit, create one there.

## (b) Each release

1. Bump `version` in `apps/mobile/app.config.ts`.
2. Write `infra/store-release/release-notes/<version>/ar.txt` and `en.txt`. Each at most 500 characters. No iPhone, iPad, iOS, Android or store names. No ayah text.
3. Check them locally:

   ```bash
   node .github/scripts/release-notes-check.mjs <version> <version>
   ```

4. Commit, then push the tag:

   ```bash
   git tag mobile-v<version> && git push origin mobile-v<version>
   ```

Store build or OTA: a store build is needed only when the native fingerprint changed. Otherwise ship an OTA update (`apps/mobile/CLAUDE.md`, «Releasing»). Pushing a `mobile-v*` tag always makes store builds, so use it only for a store release.

## (c) Recovery

- **`android` job failed:** re-run the job. Nothing was published, because the Play edit is only committed when it succeeds.
- **`ios` job failed in the fastlane step:** `eas submit` already uploaded the build. Run the lane by hand from `infra/store-release`, with the three ASC variables set in the shell:

  ```bash
  cd infra/store-release
  export ASC_KEY_ID=... ASC_ISSUER_ID=... ASC_KEY_P8="$(cat /path/to/AuthKey.p8)"
  bundle install   # Homebrew Ruby 3.4 (`/opt/homebrew/opt/ruby/bin` on PATH), not macOS system Ruby
  bundle exec fastlane ios_release version:<version> build_number:<build number>
  ```

  Do not re-run the whole `ios` job: it re-uploads the same build number and fails.
- **`ios` job failed in `eas submit`:** check the EAS submit log. If the build is in App Store Connect, use the fastlane recovery above. If not, re-run the job.
- **A store rejects a locale:** check the listing's languages. App Store locale codes are `ar-SA` and `en-US`; Play's are `ar` and `en-US`.
