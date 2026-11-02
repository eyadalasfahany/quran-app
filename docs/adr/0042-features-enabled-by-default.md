# 0042 — Features are on by default: server switches removed

Date: 2026-11-01 · Status: accepted (developer, 1 Nov 2026) · Amends ADR 0031 §1, §2, §5, §8, §11 and §12, ADR 0038 decisions 4 and 5, ADR 0040 (rollback), the content plan (OpenDua, HadeethEnc, hisnmuslim and Dorar rows), spec §7, `docs/runbooks/railway-release.md`. **Amended 2 Nov 2026: the switches are removed, not only defaulted** (see the amendment at the end)

## Context

The Azkar feature shipped behind environment switches, so that nothing reached production until someone set a variable. The developer decided on 1 Nov 2026: **remove the configuration switches; every module and feature is enabled by default, locally and in production.** Nothing should need an environment variable to work.

The switches that existed:

| Switch | Gated | Default before | Now |
| --- | --- | --- | --- |
| `AZKAR_OPENDUA_IMPORT_ENABLED` (`azkar.opendua.import_enabled`) | OpenDua wet import and its pack (ADR 0031 §1) | `false` | `true`, no env |
| `AZKAR_HISNMUSLIM_IMPORT_ENABLED` (`azkar.hisnmuslim.import_enabled`) | hisnmuslim.com wet import, and its counts and cross-check (ADR 0031 §12) | `false` | `true`, no env |
| `AZKAR_HADEETHENC_ENABLED` (`azkar.hadeethenc.enabled`) | HadeethEnc notes (ADR 0031 §12) | `false` | `true`, no env |
| `DORAR_ENABLED` (`services.dorar.enabled`) | Dorar hadith reference source (ADR 0031 §2) | `false` | `true`, no env; no base URL or token means the null source |
| `AZKAR_PRIMARY_SOURCE` (`azkar.primary_source`) | which Azkar source is the canonical one | `opendua` | constant `opendua` (a selector, not a switch) |
| `azkar.opendua.store_english` | English and transliteration storage (ADR 0031 §5) | `false` | `true` (Quran items excluded, see decision 3) |
| `azkar.opendua.audio_rights_verified` and `azkar.recording_rights` | recording import and rights (ADR 0031 §8, ADR 0040) | `false` and empty | `true` and the ADR 0040 values (decision 4) |

The config keys stay. Tests turn a feature off with `config([...])`, and the rollback is a config change (decision 9).

## Decision

1. **The environment switches are removed.** `config/azkar.php` and `config/services.php` hold the value `true` (or the constant above). `.env.example` no longer lists `AZKAR_OPENDUA_IMPORT_ENABLED`, `DORAR_ENABLED` or the other switches. The Dorar base URL, token, header, timeout, rate limit and cache TTL stay environment settings, because they are credentials and terms, not switches.
2. **`hisnmuslim` and `hadeethenc` are granted by developer decision, without written terms.** A reviewed migration (`2026_11_01_100016_grant_hisnmuslim_and_hadeethenc_content_sources`) sets both `content_sources` rows to `granted` and cites this ADR in `notes`. Neither source has published terms that cover this use. **The developer accepts that risk.** The `opendua` row was already granted by ADR 0038.
3. **English is stored, never for a Quran item.** `azkar.opendua.store_english` is `true`. The importer stores an English or transliteration rendering only for an item with no `quran` segment (ADR 0014, ADR 0038 decision 4, entry 4 and Āl ʿImrān 190–200). A test asserts that no stored item with a Quran segment has `text_en` or `transliteration`. The app shows stored English only in the English interface (checked: the reader, the details sheet and the step note read `textEn` only when the locale is `en`; transliteration is loaded but not displayed). OpenDua's attribution is not shown next to the English text: the app has no such line, and no UI was built for it (ADR 0031 §5 remains open for the app).
4. **Audio rights on, with the ADR 0040 values.** `audio_rights_verified` is `true`.
   - `stream_allowed` and `download_allowed` are `true`.
   - `attribution_en` is «Recitation by Muhammad Jumah for OpenDua». `attribution_ar` stays `null` (ADR 0038).
   - `licence_url` is `https://opendua.org/developers`.
   - `licence` is the attribution line. The step-14 plan's open question 4 was answered «as proposed, except the licence text is softened to the attribution line plus a link». So the licence text names no OpenDua recording term.
   - `redistribution_allowed` is `false` (the plan's proposal, decided by that answer).
   - `rights_verified_at` is `2026-11-01`, read as «verified by developer decision on this date», not as a signed licence.
   - **No recording is imported without its file.** A recording is imported only when its file exists at `azkar.audio_store/azkar.audio_version/<file name from the upstream URL>` (`storage/app/azkar-audio/0.0.2/`). Otherwise it is left out, and the report counts it (`recordings.missing_file`) and warns (`recording_file_missing`). The import never fails for a missing file. The app never receives an OpenDua URL: an imported row carries `/api/v1/azkar/audio/<version>/<file>`.
   - **The serving endpoint is not built.** Step 14 (provisioning the files, the endpoint, the Railway volume) is still a plan. Until its files exist, no recording is imported in any environment.
5. **Dorar is on, and does nothing without its settings.** `AzkarServiceProvider` binds the Dorar source only when `DorarConfig::isAvailable()`: enabled, a base URL and a token. Otherwise the null source answers, with no HTTP call and no error. Tests cover a missing base URL and a missing token.
6. **HadeethEnc without its snapshot is not an error.** Snapshots are git-ignored (`apps/api/storage/app/.gitignore`), so a server built from git has none. With no `manifest.json` in the snapshot directory, HadeethEnc notes are left out with a reason (`gated.hadeethenc.reason`), and the import runs. A snapshot that is present but fails its pin or its hashes is still an error.
7. **`--if-unlocked` stays, and guards real things.** `release.sh` runs `azkar:import --download --if-unlocked --build-packs`. While a lock applies, the run prints the reasons and exits 0. The locks now are: the `opendua` row is not `granted` (the rollback), a recording licence is empty, or the import flag is set to `false` in config. The Quran map is not a lock: production refuses unreviewed rows through the validator, so the run fails rather than skipping (ADR 0031 §11).
8. **Production still accepts only `reviewed` Quran map rows.** This protects Quran text and is unchanged. Rows still blocking production:
   - OpenDua (the primary, the one the release imports): **0**. The six entries that ship have six `reviewed` rows (4, 71, 75, 100, 101, 135). The nine excluded entries (ADR 0031 §11) have no items in the import. A production-mode dry run (`APP_ENV=production`) is `valid`.
   - hisnmuslim (the secondary map, keyed `hisn-al-muslim-hm:`): **22** rows are not `reviewed` (6 `candidate`, 16 `unmatched`). The release never imports hisnmuslim, so these rows block only a hisnmuslim wet import in production.
   - The counts above were read from the map files directly. `azkar:quran-map-candidates` was run with `--output` to a scratch file, so the repo map was not rewritten; its counts describe freshly generated candidates (16 items, 22 spans, 1 exact, 5 candidate, 16 unmatched), not the reviewed state.
9. **Rollback** *(superseded 2 Nov 2026: there is no flag to set; see the amendment at the end)*. Rollback is a reviewed change, not a server command. To stop serving Azkar in production: set `azkar.opendua.import_enabled` to `false` in config and deploy (the next release skips the import through `--if-unlocked`). To stop the sources, a reviewed migration sets `opendua`, `hisnmuslim` or `hadeethenc` back to `pending` (the migration's `down()` does this for the two granted here). The pack builder then refuses to build an Azkar pack.
10. **Local development** imports the real pinned OpenDua v0.0.4 with these defaults. `APP_ENV=local` accepts `candidate` map rows as warnings, and HadeethEnc candidate links produce notes. Those notes appear in the local pack and never in production (ADR 0031 §12).

## Consequences

- **The next production deploy will import Azkar.** The release runs the migration (`hisnmuslim` and `hadeethenc` become `granted`) and then the import. The OpenDua import is valid in production-mode, so it writes the `azkar` rows, bumps the resource version and builds a pack in the release container. Known gaps, which must be settled before the first deploy with these defaults:
  - **The pack is lost.** The release container's filesystem is discarded, and Railway's volume is not mounted there (step 14, «The release builds a pack nobody can read»). No Azkar pack is served until step 14 is built. The manifest hides a pack whose file is missing, so users see no Azkar yet.
  - **Every deploy bumps the Azkar version.** The importer has no fingerprint guard yet (step 14, «Fingerprint»). Once the pack is served, every deploy would force devices to re-download the azkar pack.
  - **Fewer counts in production.** The hisnmuslim snapshot is git-ignored and absent on the server, so the secondary count fill does not run. Expect about 36 counts from OpenDua, not the 215 seen locally. This follows from the code (`requiredCounts` treats an unreadable secondary as unused); it has not been run on Railway.
  - **Recordings: none** until step 14 provides the files.
- **Local (measured, 1 Nov 2026):** `azkar:import --download --build-packs` returned `imported`. Pack version 4, 1,614 rows, 133,960 bytes. Entries imported 258, excluded 9, chapters 132. Items 375 (251 recitation, 54 instruction, 70 narration). Quran segments 6, all in items without English. English stored 369, skipped 6 (the Quran items). Recordings upstream 249 (250 item objects), imported 0, missing file 250 (the file store is empty). Required counts 215 (36 from OpenDua, 179 filled from hisnmuslim), 5 conflicts with the primary kept, 41 ambiguous and left null. HadeethEnc candidate links 14, giving 14 notes (local only).
- **Tests:** the fixture tests pin `azkar.hisnmuslim.import_enabled` and `azkar.hadeethenc.enabled` to `false`, so they do not read real snapshots. Tests of those sources turn them on.
- **Not done (and why):** no UI for OpenDua's attribution next to English (not in the frames; the app has no line for it). No audio file provisioning, endpoint or volume (step 14, not approved for build). No Quran map review (the developer's task; `docs/plans/phase-6/quran-map-review.md`).

## Note, 2 Nov 2026: the app has no switches either

Developer instruction (2 Nov 2026): "make everything enabled; don't add anything configurable like enable or disable in code; all features in the app by default."

- **Removed:** the mobile build flag `EXPO_PUBLIC_AZKAR_DEV_FIXTURES`, with the effect in `apps/mobile/app/_layout.tsx` that loaded placeholder Azkar rows in development. The app never loads placeholder content. The fixture module and its test moved to `apps/mobile/src/features/azkar/data/__fixtures__/` and are imported by Jest suites only. `.env.example` no longer lists the flag.
- **Audit of the mobile app (same day):** no other code-level feature switch was found. Data-availability checks (`useAzkarAvailable`, `useAudioAvailable`), user preferences (for example the Salah bells, the Azkar autoplay, the daily reminder) and platform capability checks (Liquid Glass, Reduce Transparency) stay. `__DEV__` logging stays as developer tooling.
- **Rule:** a new feature ships on by default. Gate it on data being present (installed content, a granted permission) or on a user's choice, never on a constant, an environment variable or a build flag.
- **Consequence for ADR 0031 §9:** the development placeholder rows are no longer loadable in the app. Jest uses them through the test-only module.

## Amendment, 2 Nov 2026: switches removed, not only defaulted (developer)

Developer instruction, 2 Nov 2026: «make everything enabled; don't add anything configurable like enable or disable in code; all features in the app by default.» Decision 1 above kept the keys set to `true`, so tests could still turn them off. This amendment removes the switches themselves.

**Removed**

- `config/azkar.php`: `opendua.import_enabled`, `hisnmuslim.import_enabled`, `hadeethenc.enabled`, `opendua.store_english`, `opendua.audio_rights_verified`, and `recording_rights.stream_allowed` and `download_allowed`. The code always imports, always stores English (never for an item that holds a Quran segment, ADR 0014), imports every recording whose file is on the audio disk, and allows streaming and download.
- `config/services.php`: `dorar.enabled`. Dorar is used whenever a base URL and a token are set. Those are credentials, not a switch.
- The permission locks: `AzkarImporter::lockReasons`, the `--if-unlocked` option, the `permission_status` checks in the importer, `PackBuilder`, `ContentDeliveryService::isServed` and `EnsureContentPacksCommand`, `Resource::hasDeliverableRights`, `PermissionStatus::allowsDelivery`, and the `azkar:source-permission` command with its tests. The `status` `locked` of the import report goes with them.
- Decision 7 (`--if-unlocked` stays) is superseded. `docker/release.sh` runs the import plainly.

**Kept, because they protect correctness and are not switches**

- The pinned SHA-256 of each source file, and the pinned SHA-256 of the audio manifest (`azkar.audio.manifest_sha256`).
- Validation: a failure writes nothing and fails the run.
- Production accepts only `reviewed` Quran map rows (ADR 0031 §11).
- `azkar.excluded_entries` (ADR 0031 §11).
- `azkar.primary_source`, as a constant `opendua`. It decides which Azkar resource is served.
- `content_sources.permission_status` and its data, as provenance only. The migrations that set it (ADR 0038, ADR 0042) are unchanged.

**Consequences**

- A source whose `permission_status` is `pending` or `denied` is packed and listed when it is the primary. The status no longer blocks anything. The developer owns that risk.
- Rollback is a code change or a data change, both reviewed. The runbook describes it. Setting a flag is no longer an option.
- The fixture tests no longer pin switches to `false`. They point the snapshot dates at a folder that does not exist (`1900-01-01`), so they never read a real snapshot.
