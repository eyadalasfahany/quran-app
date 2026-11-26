# Plan: download the Seerah pack automatically

**Status:** decided (developer, 26 Nov 2026). It rests on ADR 0097, which is **accepted**, except for the frame change. The changed `SeerahStateDownloading` frame (no Cancel) is drawn and awaits approval (ADR 0087).
- Steps 1 to 3 do not depend on the frame and may start.
- Step 4 waits for the frame approval.

**Request** (developer, 26 Nov 2026): every user gets the Seerah pack without tapping «تنزيل السيرة». Until now the Seerah screen showed the download card (frame `screens/frames/seerah/SeerahStateDownload.html`, about 0.2 MB) until the user tapped it.

## Developer answers (26 Nov 2026)

| # | Question | Answer |
| --- | --- | --- |
| Q1 | Who gets it | **Every user** whose synced catalogue lists Seerah: new installs and existing users who never downloaded it. |
| Q2 | Cellular | **Any network** for Seerah: the Wi-Fi-only setting is skipped (`anyNetwork`). Hadith and audio keep the gate. |
| Q3 | Removal | **Not removable**, like Azkar and Duas. |
| Q4 | Route | **The app starts the existing on-demand install itself.** Not the Azkar and Duas sync-selection route. |
| Q5 | Cancel | **Removed.** The downloading card has no Cancel button, and the auto-download always proceeds. |

## Rests on

**Root `CLAUDE.md`**
- Non-negotiable 4: offline-first; the network is never on the path of a tap.
- The OTA release rule.
- The frontend and delegation rules.
- The ADR 0087 design flow.

**`apps/mobile/CLAUDE.md`**
- «Where state lives».
- «Releasing».

**Spec `docs/technical-spec.md`**
- §7 hop 3 (lines 466–473): content sync runs at app start and on foreground after 6 hours, and a `304` ends the run.
- §14 test layers (line 858): App unit and component tests cover the «sync engine».
- §13 (line 795): there is no staging server (ADR 0022).
- §11 is user-data sync. Its cases do not apply, because no personal data is written.

**ADRs**
- ADR 0091 decision 2: Seerah reuses the pack, manifest, `installed_resources` and download machinery.
  - ADR 0091 is **Proposed**.
  - Its waiver of the ADR 0087 approval gate was for Phase 8 only, so this frame change goes through approval.
- ADR 0096: Seerah layout. Unaffected.
- ADR 0095 §4: `seerah:import --release` is in no setup command.
- ADR 0031 §9 and ADR 0044: Azkar and Duas sync selection. This is the alternative, not chosen.

**`docs/plans/phase-8.md`**
- P2: the pack flow.
- P7: the Menu card is gated on an installed pack or a listed catalogue entry.
- Q13: delivered as a pack.
- Steps 21, 26, 34 and 35.

**Code read: mobile**
- `apps/mobile/src/core/sync/use-content-sync.ts`
- `apps/mobile/src/core/sync/device-sync.ts`
- `apps/mobile/src/core/sync/install-resource.ts`
  - `inFlight`
  - `keepOnDemand` for `seerah`, lines 96–98
- `apps/mobile/src/core/sync/content-sync.ts`
  - lines 114–131: selection, the on-demand ids, removal
  - lines 156–189: updates
  - lines 276–277: temp paths
- `apps/mobile/src/core/sync/selection.ts`
- `apps/mobile/src/core/sync/on-demand.ts`
- `apps/mobile/src/core/sync/catalog-version.ts`
- `apps/mobile/src/features/seerah/availability.ts`
- `apps/mobile/src/features/seerah/hooks/hooks.ts`
- `apps/mobile/src/features/seerah/hooks/useSeerahDownload.ts`
- `apps/mobile/src/features/seerah/data/content-repository.ts:66–78`
- `apps/mobile/src/features/seerah/screens/SeerahScreen.tsx:211–247`
- `apps/mobile/src/features/seerah/components/SeerahStateView.tsx`
- The colocated tests of the Seerah files above.
- `apps/mobile/src/features/hadith/downloads.ts`: the store, the Wi-Fi gate, `waiting`.
- `apps/mobile/src/features/audio/settings-model.ts:19–21`: Wi-Fi only defaults to true.
- `apps/mobile/src/features/downloads/`: no Seerah section.
- `apps/mobile/app/_layout.tsx:57`
- `apps/mobile/__tests__/content-selection.test.ts`
- `apps/mobile/__tests__/content-sync.test.ts`
- `apps/mobile/__tests__/install-resource.test.ts`

**Code read: API**
- `apps/api/app/Domains/Content/Services/ContentDeliveryService.php:38–79, 186–203`: a resource with no served pack is left out of the manifest.
- `apps/api/app/Domains/Content/Http/Resources/ContentManifestResource.php:58–69`: the manifest ETag is the SHA-256 of the body.
- `apps/api/app/Domains/Content/Packs/SeerahPackReadiness.php`
- `apps/api/app/Domains/Seerah/Console/ImportSeerahCommand.php:19–41`: production needs `--release`.
- `apps/api/docker/start-web.sh`: no Seerah line.

## What happens today

1. Sync never selects Seerah. `AUTO_SELECTED_PACK_GROUPS` is `['azkar', 'duas']`.
2. The Menu card shows once the synced catalogue lists Seerah.
3. `useSeerahDownload` shows one of these views:
   - `download`: online, entry listed, nothing running.
   - `downloading`: progress and Cancel. The store's `waiting` is shown this way too.
   - `offline`.
   - `error`.
4. The tap calls `useHadithDownloads.start` → `installResource`, which fetches the manifest without an ETag, imports the pack, then runs `keepOnDemand`.
5. From then on sync keeps Seerah selected through `onDemandResourceIds` and updates it like any installed resource.
6. In production the pack is not published, so the manifest has no Seerah entry and the Menu card is hidden.

## Design (ADR 0097)

### 1. Where it hooks in, and the trigger rules

**Two trigger points:**
- **After every content sync run settles**, whether it succeeded or failed.
  - `app/_layout.tsx` passes `useContentSync` a module-level run: `runDeviceContentSync().finally(autoInstallSeerah)`.
  - The install is not awaited, so the run's 10-minute deadline does not cover it.
  - Cadence: once per launch when `content.db` is ready, and on foreground when the last *successful* run is over 6 h old.
  - A run that throws (offline) never sets `contentLastSyncAt`, so every foreground while offline retries.
- **When the Seerah screen mounts**, or when its catalogue entry appears while it is open.
  - This covers the first launch: the catalogue is written early in the first sync, so the Menu card can show before that run settles.

**The guard** is one pure function, `seerahAutoInstallAction(entry, running)`:

| Catalogue entry | Store entry for its id | Action |
| --- | --- | --- |
| none (not published, or not synced yet) | any | nothing |
| `installed` | any | nothing |
| listed, not installed | `downloading` or `waiting` | nothing |
| listed, not installed | `failed` or none | `start(id, { anyNetwork: true })` |

**Rules the guard depends on:**
- **Events only.** The trigger never keys on `useCatalogVersion.version` or `changedAt`.
  - `installResource` calls `writeCatalog`, which bumps both.
  - Keying on them would make a pack that always fails loop over the network.
- **No network on the path of a tap.** The trigger starts a background install, and the screen reads only `content.db` and the store. Retry taps do the same and wait on nothing.
- **Offline.** The install fails with reason `network`, and the screen shows the offline card with its retry. The install retries at the next settle or the next screen open. No reconnect listener is added; that limit already exists.
- **Any network.** Seerah calls pass `anyNetwork: true`, so Seerah never reaches `waiting`.
- **Not in sync selection.** Seerah stays out of `AUTO_SELECTED_PACK_GROUPS`. A test guards this, because that route brings the 304 trap and the temp-path race described below.

### 2. What the Seerah screen shows

| Frame | After this change |
| --- | --- |
| `SeerahStateDownloading` | **Changed: no Cancel button.** Title, progress bar and «… من … م.ب · يمكنك مغادرة الشاشة، ويكتمل التنزيل.» are unchanged. This is the normal first view. Redrawn and **awaiting approval**. |
| `SeerahStateOffline` | Unchanged. «إعادة المحاولة» starts the same install. |
| `SeerahStateError` | Unchanged. «تنزيل من جديد» starts the same install. It also covers an installed pack with no events, as today. |
| `SeerahStateDownload` | **Unreachable.** Nothing in the app shows it any more. |
| `SeerahStateEmptyYear` | Unchanged; not a download state. |

**How `SeerahStateDownload` becomes unreachable:**
- `useSeerahDownload` maps «listed, not installed, nothing running, online» to `downloading` at progress 0, instead of `download`. The auto-install starts in the same commit (the screen effect) or is already running, so the first frame never flashes a download button.
- With `anyNetwork`, `waiting` never happens for Seerah.
- So no fallback case remains:
  - offline → the offline card;
  - every failure → offline or error, each with its retry.
- The `download` view kind is removed from the hook and from `SeerahStateView`, along with their now-unused strings. The frame itself stays in `screens/` until the developer decides to retire it; that is a design change of its own (open item D1).

### 3. Removal

- The pack is not removable. Today there is no Downloads row and no way to forget an on-demand id.
- A rebuilt `content.db` forgets the pack, and the next settle reinstalls it.

### 4. Pack updates

- **Automatic, with no new code.** `keepOnDemand` keeps Seerah selected, so `syncContent` applies a new version through the change feed, or through a pack after a `410` or below the change floor.
- There is no Wi-Fi gate on updates, the same as all content updates today.
- An open event page re-reads on the catalogue bump.

### 5. Unpublished pack (production gate)

- The manifest leaves out a resource without a served pack (`ContentDeliveryService.php:43–48`), so the guard does nothing.
- In production the change is a no-op until all three of these are done:
  - the content gate (phase-8 step 21);
  - `seerah:import --release`;
  - the step 26 wiring.
- Local `--structure` imports serve draft data, so local devices auto-install drafts.
- A pack that is later withdrawn is removed by sync as unpublished (`content-sync.ts:119–121`), and the Menu card hides.

## Alternative not chosen: the Azkar and Duas route (Q4)

Adding `seerah` to `AUTO_SELECTED_PACK_GROUPS` would bring three problems:
1. **The 304 trap.** The manifest ETag is a body hash. A device that stored it while Seerah was already listed gets `304`, and the run ends there.
2. **The temp-path race.** Sync's `importPack` bypasses `inFlight` and uses the same temp path as a tapped install.
3. **No progress.** Sync reports no progress, so the downloading card's bar cannot fill.

## Design change (ADR 0087)

- **Drawn:** `screens/frames/seerah/SeerahStateDownloading.html`. The Cancel link «إلغاء التنزيل» is removed; nothing else changed.
- **Caption:** its `gx-fig` caption in `screens/index.html` already read «جارٍ التنزيل (بانتظار الموافقة)» (Phase 8 frames are not yet approved), so that file needed no edit.
- **Rebuilt** with `python3 design/screens/scripts/build.py && python3 design/scripts/build_reference.py`.
- **Checked** with `npm run check:html -w @quran/design-tokens`: 0 mismatches; 307 frames, all loaded, linked and free of inlined images.
- **Review link:** `design/seerah/SeerahStateDownloading/index.html?theme=both&dir=both&sizes=compact%2Cmedium%2Cexpanded`
- **Derived variants** (dark, LTR, other sizes) are drafts.

## Steps

- Each step is one reviewable change.
- Steps 1 to 3 are logic and go to a Haiku implementer with this brief.
- Step 4 touches Seerah UI and goes to an Opus implementer (developer rule, 15 Nov 2026).
- Jest runs scoped, with `--maxWorkers=2`, never two runs at once.

| # | Change | Files | Tests (written with the step) |
| --- | --- | --- | --- |
| 1 | **Store option.** `start(id, options?: { anyNetwork?: boolean })` skips the Wi-Fi gate when `anyNetwork` is true. Off by default. | `src/features/hadith/downloads.ts`, `src/features/hadith/downloads.test.ts` | With `anyNetwork`, it installs on cellular with Wi-Fi only on. Without it, it still waits. The busy guard still blocks a second start. |
| 2 | **Guard and trigger.** `seerahAutoInstallAction(entry, running)` is pure. `autoInstallSeerah()` opens `content.db` in a try, reads `getSeerahCatalogEntry`, reads the store and calls `start(id, { anyNetwork: true })`. It never throws and never awaits the install. Also export `runContentSyncThenSeerah`. | new `src/features/seerah/auto-install.ts`, `auto-install.test.ts` | The four guard rows. `autoInstallSeerah` with `content.db` not open does nothing and does not throw. With a listed, not-installed entry it starts once, and a second call while downloading does not start again. `runContentSyncThenSeerah` triggers after a resolved run and after a rejected run, and still rejects, so the scheduler leaves `contentLastSyncAt` unset when offline. |
| 3 | **Wire it into sync settle.** `useContentSync(runContentSyncThenSeerah)` in `_layout.tsx`. `core/sync` does not import the feature; the root layout composes them. | `app/_layout.tsx`, `__tests__/content-selection.test.ts` | The selection test asserts **Seerah is not auto-selected by sync**, beside the Azkar, Duas and hadith cases at lines 73–102. A `bumpCatalogVersion()` alone starts nothing: a `failed` entry is not restarted by a bump. That test goes in `auto-install.test.ts` if step 2 has not added it already. |
| 4 | **Screen. Waits for the frame approval.** See the four parts after this table. | `src/features/seerah/hooks/useSeerahDownload.ts` (+ test), `src/features/seerah/components/SeerahStateView.tsx` (+ test), `src/features/seerah/screens/SeerahScreen.tsx` (+ test), `src/core/i18n/locales/ar.json`, `en.json` | See the list of step 4 tests after the table. |
| 5 | **Docs.** The spec and plan edits listed below, once the other session releases `docs/technical-spec.md`. | listed below | none |

**Step 4 changes, in four parts:**
1. **`useSeerahDownload`:**
   - It drops `cancel` and the `download` kind.
   - «listed, not installed, nothing running, online» becomes `downloading` at 0.
   - `start` passes `anyNetwork`.
   - Update its JSDoc.
2. **`SeerahStateView`:**
   - It drops the `download` kind.
   - The downloading card has no action. The `downloading` copy entry has no action key, and the secondary-button branch goes.
   - The meta row with the download icon stays.
3. **`SeerahScreen`:**
   - It runs `autoInstallSeerah()` in an effect keyed on `catalog?.resourceId`.
   - It passes no `onAction` for `downloading`.
   - Update the screen's JSDoc, which mentions «not downloaded».
4. **Strings:** remove the unused `seerah.states.downloadTitle`, `downloadBody`, `downloadMeta`, `downloadAction` and `downloadingAction` from `ar.json` and `en.json`. Grep first: today only `SeerahStateView.tsx` uses them.

**Step 4 tests:**
- **`useSeerahDownload`:**
  - Listed, not installed, idle and online gives `downloading` at 0.
  - Offline and error are unchanged.
  - `start` passes `anyNetwork`.
- **`SeerahStateView`**, in ar and en:
  - The downloading card has a progress bar with its accessibility value and no button.
  - Offline and error keep their action.
- **`SeerahScreen`**, in ar and en:
  - Listed and not installed opens on the downloading card with no tap and no button, and starts the install once.
  - Installed starts nothing.
  - A `failed` entry restarts on mount.
  - An entry arriving after mount starts once.
  - The offline and error retries start the install.
  - The existing tests that open on the download card are rewritten.

**Checks before calling it done:**
- Mobile: `npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`.
- No API, contract or dependency change.
- **Visual check:** on the booted iPhone 17 Pro simulator, against a local API with a `--structure` import:
  - Open Seerah on a fresh `content.db`. The downloading card shows with no tap and no Cancel; compare it with `python3 packages/design-tokens/scripts/frame-shot.py SeerahStateDownloading <out.png>`. Then the map shows.
  - Check offline and error with their retry, in Arabic and English.
  - Shut the simulator down after.
- **Release:** an EAS Update once `npx eas-cli fingerprint:compare` shows no change. It ships with or after the Phase 8 app release (phase-8 step 35).

### Spec and plan edits implied (describe only; another session holds the spec)

- **§7 hop 3:** add an item.
  - The Seerah pack (ADR 0097) installs with no user choice. It runs after each content sync run settles and when the Seerah screen opens, through the on-demand install, over any network. The user cannot cancel or remove it.
  - Once installed, it is kept by the on-demand list and updated like any installed resource.
  - It is not in sync's auto-selected groups.
- **ADR 0091:** in its amendments section, add a pointer to ADR 0097 for decision 2's «download sheet». ADR 0091 is Proposed; do not rewrite its text.
- **`docs/plans/phase-8.md`:**
  - Step 31: «download state» becomes «downloaded automatically (ADR 0097)».
  - The `SeerahStates` frame row: «not downloaded (size, button)» is gone, and downloading has no Cancel.
  - The step 34 Maestro flow expects no download tap.
- **`docs/content-plan.md`:** no change.

## Tests the spec requires

- **Spec §14 «sync engine» Jest row:** steps 2 and 3 add unit tests next to the sync engine, and step 3 adds a selection regression guard.
- **Already covered:**
  - Updates of an on-demand resource: `__tests__/install-resource.test.ts:352`.
  - Removal of an unpublished resource: `__tests__/content-sync.test.ts:1501`.
- **Spec §11's cases** (user-data sync) do not apply: nothing writes to `user.db` or the outbox.
- **Maestro:** no new flow. The phase-8 step 34 flow opens Seerah and now expects no tap.

## Open items for the developer

| # | Item | Default |
| --- | --- | --- |
| D1 | **Retire the `SeerahStateDownload` frame?** | **Done (developer, 26 Nov 2026):** retired; frame file and its `screens/index.html` block removed, `design/` rebuilt. |
| D2 | **Approve the redrawn `SeerahStateDownloading`** (no Cancel) at the review link above. | Step 4 waits for it |

There are no licensing or religious-interpretation decisions. No content, source or migration change.

## Release blockers

1. **The Seerah pack is not published in production.** Until it is, the change does nothing for users. Publishing needs:
   - the content gate (phase-8 step 21);
   - `seerah:import --release`, because production refuses `--structure` (`ImportSeerahCommand.php:38–41`);
   - the step 26 line in `docker/start-web.sh`, which is absent today. ADR 0095 §4 also keeps Seerah out of the setup commands.
2. **The redrawn `SeerahStateDownloading` frame approved (D2)** before step 4 merges.
3. **The Phase 8 app release (step 35)** ships the Seerah screens. This change ships with it or follows it as an EAS Update, after `fingerprint:compare` shows no change.

## Risks

- **Existing race, not fixed here.**
  - In `install-resource.ts`, `importPack` writes `installed_resources`, then awaits two temp-file removals before `keepOnDemand` runs (lines 96–98).
  - A sync whose manifest arrives in that window removes the just-installed pack as not selected (`content-sync.ts:119–126`). The next trigger reinstalls it.
  - It is rare, and it already exists for hadith and tafsir.
  - The fix (call `keepOnDemand` before the removals, or inside the import transaction) touches shared sync code, so it is its own change.
- **Existing race, not fixed here.** `useSeerahDownload`, when there is no catalogue entry, and `HadithCollectionsScreen` call `runDeviceContentSync()` outside the scheduler's `running` guard. This plan adds no new caller.
- **A pack that always fails** (for example a bad checksum on the server) is retried after each sync settle and each screen open, at 0.2 MB each time. Catalogue bumps never retry it (step 3 test).
- **No Cancel:** a user on a metered connection cannot stop the 0.2 MB download. The developer accepted this (Q5).
- **Local devices auto-install draft data** from `--structure` imports. This is expected in development.
