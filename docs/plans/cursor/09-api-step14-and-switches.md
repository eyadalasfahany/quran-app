# Prompt 9 — API step 14 close-out, remaining switches, Hadith kill switch (resume)

Monorepo `D:\projects\quran-app`, `apps/api` plus docs. Follow @docs/plans/cursor/README.md. Read first: @apps/api/CLAUDE.md @.claude/agent-rules.md @docs/plans/phase-6/step-14-audio-and-storage.md @docs/adr/0040-azkar-audio-hosted-by-taybah.md @docs/adr/0044-packs-build-at-web-start.md (upstream) and the features-enabled ADR (`docs/adr/0045-features-enabled-by-default.md` after prompt 14; `0042-features-enabled-by-default.md` before it) @docs/runbooks/railway-release.md.

**Merge context (HEAD `8d982cd`):** origin/main was merged with the local work kept. **One option name: upstream's `--defer-pack`** (our `--no-pack` was renamed everywhere). The report uses upstream's `'deferred' => true`. Our content fingerprint guard (`STATUS_UNCHANGED`, `resources.import_fingerprint`), our snapshot fetches in `release.sh` and our `start-web.sh` (mkdir, `azkar:audio-verify`, `content:ensure-packs`) are kept.

**Already done (verified 2 Nov 2026; don't redo):**
- `config/filesystems.php` `azkar_audio` disk.
- `docker/start-web.sh` and `railway.json` `startCommand`.
- `release.sh`: migrate, `azkar:snapshot hisnmuslim|hadeethenc --pinned` (warn and continue), `azkar:import --download --defer-pack`.
- `AzkarImportFingerprint` plus migration `2026_11_02_100017`.
- `Azkar/Audio/*` (manifest, files, sync, verifier).
- `azkar:audio-sync` and `azkar:audio-verify`.
- `AzkarAudioController` and `routes.php`: Range, ETag, strict regexes, `throttle:azkar-audio`.
- `AzkarAudioReadiness`, the pinned manifest `resources/azkar/audio/hisn-0.0.2.manifest.json`.
- OpenAPI and `schema.d.ts` have the audio route. `APP_URL` is in `.env.example`.
- The config switches are gone from `config/azkar.php` and `config/services.php`, and so are `SourcePermissionCommand` and its test.
- `ImportAzkarCommand` no longer declares `--if-unlocked`.
- `PermissionStatusIsProvenanceTest`, `StartupConfigTest`, `AzkarPackAudioAndHealTest`, `SnapshotPinnedTest`, `AzkarRecordingFirstItemTest`.
- Pint and PHPStan pass. Pest: 474 tests, 5 failures, all of them known Windows-only.

**Remaining work:**
1. **Verify the merge.** Grep `apps/api` and `docs` for `no-pack`, `noPack`, `--if-unlocked`, `lockReasons`, `hasDeliverableRights`, `source-permission`, `import_enabled`, `store_english`, `audio_rights_verified`, `stream_allowed`, `download_allowed`, `services.dorar.enabled`, `AZKAR_AUDIO_ENABLED` and `heal-packs`. Code and tests must have none, except `StartupConfigTest.php:33`'s `not->toContain('--if-unlocked')`, which stays. `php artisan list azkar` must show no `source-permission`, and `php artisan azkar:import --help` must show `--defer-pack` and no `--if-unlocked`/`--no-pack`.
2. **Docs that still describe removed switches or old names.** Change each one to the current behaviour, and keep history only as "(removed 2 Nov 2026)":
   - `docs/plans/phase-6/step-14-audio-and-storage.md`: lines 15, 35, 91, 139-156 (`content:heal-packs` is `content:ensure-packs`; the release line is `azkar:import --download --defer-pack`, with no `--if-unlocked`), 169, 174, 201, 206-210 (no `AZKAR_AUDIO_ENABLED`), 244, 270 and 286. Set the Status section to: done in code, with the Railway dashboard steps left to the developer.
   - `docs/technical-spec.md:429` still says `azkar:import --download --no-pack`. Change it to `--defer-pack` and cite upstream ADR 0044 (packs build at web start).
   - Then grep `docs/` for `no-pack`. Every hit becomes `--defer-pack`.
   - `docs/plans/phase-6/step-03-ingestion.md:24`, `step-09-dorar-adapter.md:29`, `step-13-more-sources.md:10`, `docs/adr/0040-azkar-audio-hosted-by-taybah.md:42`, `docs/adr/0046-duas.md:108-109` and `docs/plans/duas.md:123,126`. The Duas release line becomes `duas:import --download --defer-pack`, with no lock.
3. **Runbook and Railway checklist** (`docs/runbooks/railway-release.md`): check it against the scripts as they now are. It needs: the three containers; the variables table (`APP_URL` = the public API origin, `QUEUE_CONNECTION=sync`, the volume at `/app/storage/app`, no Azkar switch); first audio provisioning (`azkar:audio-sync`, then `azkar:import --download --defer-pack`, then a redeploy or `content:ensure-packs`); rollback; volume recovery. End it with a checklist of `- [ ]` boxes for the developer's dashboard steps.
4. **Hadith kill switch removal** (developer decision, 2 Nov 2026). The Hadith code is not in this tree (no `config/hadith.php`; the branch `ft/hadith` is not local), so **change the docs only, and say so in your summary**.
   - Append «Amendment, 2 Nov 2026: no kill switch» to `docs/adr/0042-hadith-collections-source.md`. Edit only the amendment, not lines 53-56. It records that `HADITH_COLLECTIONS_IMPORT_ENABLED` is not built and that the import runs on every deploy like Azkar. Rollback is a revert or a data migration.
   - Rewrite `docs/plans/phase-7/step-02-env-config-locks.md` so there is no `import_enabled`, `isOn`, `offReason`, `HadithKillSwitchTest` or `.env.example` line. Keep `HADITH_API_KEY` dev-only.
   - Remove the switch from `docs/plans/phase-7.md:27,40,189,193,204,216,279` (step 17 becomes `hadith:import --download --defer-pack`; RB1 is removed), `docs/plans/phase-7/README.md:36`, `docs/plans/phase-7/spec-changes.md` and `docs/technical-spec.md:174,430`.
   - In root `CLAUDE.md:68`, drop the clause "behind the kill switch `HADITH_COLLECTIONS_IMPORT_ENABLED` (true in production at release)".
5. **Local run** (Laragon MySQL `quran`/`quran`; serve on the LAN):
   ```bash
   cd apps/api && php artisan migrate && php artisan azkar:audio-sync && php artisan azkar:audio-verify \
     && php artisan azkar:import --download --defer-pack && php artisan content:ensure-packs
   php artisan serve --host=0.0.0.0 --port=8000   # separate terminal
   curl -s -D - -o NUL -H "Range: bytes=0-1023" http://192.168.1.20:8000/api/v1/azkar/audio/0.0.2/<first file in the manifest>
   curl -s -D - -o NUL -H 'If-None-Match: "<etag from above>"' http://192.168.1.20:8000/api/v1/azkar/audio/0.0.2/<same file>
   curl -s http://192.168.1.20:8000/api/v1/azkar/audio/0.0.2/..%2F.env   # must be 404 problem+json
   ```
   Expect `206`, `Content-Range: bytes 0-1023/<size>`, `Accept-Ranges: bytes`, `ETag`, then `304`, then `404`. Run the import a second time: the report says `unchanged`, and `resources.version` doesn't change. Put the outputs (status lines and counts only, no text) in your summary.
6. Regenerate the contract only if a route or resource changed: `npm run generate -w @quran/api-contract`.

**Acceptance:** the grep in item 1 is clean; `release.sh` and `start-web.sh` match the runbook word for word on order; no Hadith switch appears anywhere in docs as a plan; Pest has only the known Windows failures; the local run outputs are as expected.

**Gates (from `apps/api`):** `pint --test`, `phpstan analyse`, `pest` (README paths). Don't touch `apps/mobile`.
