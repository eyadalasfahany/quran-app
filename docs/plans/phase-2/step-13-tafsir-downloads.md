# Step 13 — Download tafsirs from the tafsir panel

Follow [README.md](README.md). Needs step 12 (names on the device). Touches sync and adds UI, so the plan and the new frame are approved before code.

**Goal (developer, 28 Oct 2026):** when no tafsir is on the phone, the tafsir panel lists the Arabic tafsirs the API offers, each with a download button, instead of a bare empty state. The rows look like the Downloads screen's (`#Downloads` frame).

## Design (frame first)
- New frame `#TafsirDownload` in `quran-app-screens.html`, beside `#Tafsir`: the same sheet header («التفسير», «البقرة · الآية ٢»), a short line («نزّل تفسيرًا لقراءته بدون إنترنت»), then a card of rows built from the `#Downloads` rows: title (`name_ar`), subtitle (author · size), trailing pill «تنزيل»; a downloading row shows the stop button and the progress bar; an installed row shows «عرض». Same tokens as `#Downloads`. Tablet panel variant follows the side-panel layout.
- **Approved** by the developer (28 Oct 2026), with two decisions: a downloading row's subtitle shows both the status and the details («جارٍ التنزيل · ابن كثير · ٤٫٨ م.ب»); a finished download switches its row to «عرض» and waits for a tap — the panel does not jump to the tafsir.

## Chips list every tafsir (developer, 28 Oct 2026)
The chip row lists every Arabic tafsir in the device catalogue, installed or not, as the `#Tafsir` frame draws («التفسير الميسر», «ابن كثير», «السعدي»). Selecting an installed chip shows its passage; selecting one that isn't installed shows that tafsir's `DownloadRow` in place of the passage («تنزيل» → progress → «عرض»; «عرض» shows the passage). Reading a tafsir online before download is out of scope: the API serves whole packs only.

## Data
- **Catalogue on the device:** `content.db` migration 0004 (shared with step 12) adds `catalog_resources` (`resource_id`, `group`, `name`, `name_ar`, `author_name`, `language_code`, `direction`, `version`, `pack_size_bytes`), rewritten from every manifest the sync reads. It's derived data, safe to rebuild. With the API's Arabic-only filter (ADR 0015) it holds only Arabic tafsirs.
- **Per-resource download:** `core/sync` gets `installResource(resourceId, onProgress, signal)` that reuses the pack download, checksum and import path, reports progress and can be cancelled. When no tafsir was chosen yet, the reader settings' tafsir choice becomes the first one downloaded, but the panel stays on the list until «عرض» is tapped.
- **Offline:** with no catalogue yet and no network, the panel keeps today's empty state with a retry.

## Components
- `DownloadRow` in `src/shared/ui/` (title, subtitle, state `available | downloading | installed`, progress, actions), reused later by the Downloads screen.
- `TafsirDownloadList` in `src/features/reader/panels/`.
- Each with its colocated test (render, every state, press, RTL ar/en, a11y: button labels, progress value).

## Tests
Catalogue rewrite from a manifest; install progress and cancel; checksum failure leaves nothing installed; panel shows the list when nothing is installed and the passage after a download.

## Remaining work (brief, 29 Oct 2026)

**Already built. Don't redo it:**
- `catalog_resources` (migration 0004), `writeCatalog`, and `listCatalogTafsirs` in `features/reader/data/tafsir.ts`.
- `installResource(id, { onProgress, signal })` in `core/sync`, with its tests in `__tests__/install-resource.test.ts` (progress, cancel, checksum, network, shared promise, first tafsir becomes the choice).
- `DownloadRow` in `src/shared/ui/`, with its tests.
- The `ui.download.{start,cancel,open}` strings.

**What's missing:**
- Arabic author names.
- A download store that outlives the panel.
- `TafsirDownloadList`.
- The panel's two download states.

The work comes in three parts. Send each to the implementer on its own. The reviewer checks each part before the next one starts.

### Decisions (developer, 29 Oct 2026)
- **Arabic authors:** QF's `author_name` is English («Hafiz Ibn Kathir») or null (Jalalayn), and QF has no Arabic author field. The frame draws Arabic authors, so the API serves `author_ar` from a config override map. This follows the `display_names.ar` pattern from step 12, because names and credits are not Quran text. The UI shows `author_ar` in Arabic and `author_name` in English, and falls back to the other one. With neither, the author is left out of the subtitle.
- **Failed download:** the row goes back to «تنزيل», and its subtitle reads «تعذّر التنزيل · {author} · {size}» until the next tap. The layout doesn't change; only the string is new.

### Part 1: API and contract (`author_ar`)
1. **Config:** in `apps/api/config/quran.php`, add `display_authors.ar` next to `display_names`, keyed by QF source id (`resources.source_key`). The developer confirms these credits before merge:

   | Source id | Tafsir | `author_ar` |
   | --- | --- | --- |
   | 14 | Ibn Kathir | ابن كثير |
   | 90 | al-Qurtubi | القرطبي |
   | 93 | al-Wasit | محمد سيد طنطاوي |
   | 94 | al-Baghawi | البغوي |
   | 926 | Jalalayn (prelive) | جلال الدين المحلي والسيوطي |

   Al-Muyassar («عبد الله بن عبد المحسن التركي وآخرون»), al-Sa'di («عبد الرحمن السعدي») and al-Tabari are added once the production catalogue is synced and their source ids are read from it. Don't guess ids.
2. **Serving:** in `ContentDeliveryService`, add `servedArabicAuthor(Resource)`, shaped like `servedArabicName`. It returns the override for tafsirs and null otherwise. It needs no database column.
3. **Manifest:** pass `authorAr` into the manifest entry data, and add `'author_ar' => $this->resource->authorAr` in `ContentManifestEntryResource`, next to `author_name`. It's nullable and required in the schema, like `name_ar`. Update the docblock shape.
4. **Tests (Pest):**
   - The manifest sends `author_ar` from the override.
   - It's null without an override.
   - It's null for a non-tafsir resource.
   - The manifest ETag changes when the override changes. The ETag is the body hash, so this test documents that.
5. **Contract:** run `npm run generate -w @quran/api-contract`, and commit `openapi.json` and `src/schema.d.ts` with the change.
6. **Docs:** in `docs/content-plan.md` (the catalogue item, around "showing QF's name, author and language fields"), add that Arabic author names come from a config override. Add the same to the step 12 "Arabic names" note.
7. **Gate:** `cd apps/api && composer qa`.

### Part 2: device data (`author_ar` on the device)
1. **`content.db` migration 0005:** add nullable `author_ar` to `installed_resources` and to `catalog_resources`. Generate it with drizzle-kit after updating `src/core/db/content/schema.ts`; old migrations stay as they are. Nullable is enough. The migration also deletes the stored `manifest_etag`: an app that read the new manifest before it had the column would otherwise get a 304 for ever, and `author_ar` would never be backfilled (found in review, 29 Oct 2026).
2. **Sync (`core/sync/content-sync.ts`):** write `author_ar` wherever `author_name` is written today: the `installed_resources` upsert, the `catalog_resources` insert, and the name refresh update (`resourceNameValues`).
3. **Reader data:**
   - `ResourceNames` gains `authorAr`.
   - `listInstalledTafsirs` and `listCatalogTafsirs` select it.
   - `TafsirOption` gains `authorAr`.
4. **Display helper:** in `panels/panel-text.ts`, add `tafsirAuthorName(option, locale): string | null`, using the same fallback rule as `tafsirDisplayName`. The credit line «المصدر: {author}» uses it, falling back to the tafsir's display name as it does today.
5. **Tests:**
   - The migration adds both columns.
   - Sync writes and updates `author_ar` in both tables.
   - `tafsirAuthorName` in ar and en, for every fallback case.
   - The credit line in Arabic shows the Arabic author.
6. **Gate:** `cd apps/mobile && npm run lint && npx tsc --noEmit && npm test && npx expo-doctor`.

### Part 3: the panel UI
Before building, read `.agents/skills/apple-design/SKILL.md` and the references the README lists.

**3a. Download store:** `src/features/reader/panels/tafsir-downloads.ts`, a Zustand store (version table pin 5.0.16).
- **Why a store:** the sheet unmounts on close and the panel remounts on verse change. `installResource` shares the running promise, but only the first caller's `onProgress` and `signal` are used, so component state would lose the progress bar.
- **State:** `{ byId: Record<number, { status: 'downloading' | 'failed'; progress: number }> }`. Keep the `AbortController`s in a module-level `Map`, outside the state.
- **`start(id)`:**
  - Does nothing while that id is downloading.
  - Otherwise it sets `downloading` at 0 and calls `installResource(id, { onProgress, signal })`.
  - On the result:
    - `installed`: remove the entry and bump `installedVersion`, a counter in the store.
    - `cancelled`: remove the entry.
    - `failed`: set `failed`.
- **`cancel(id)`:** aborts the download.
- **Tests:** start → progress → installed bumps `installedVersion`; cancel removes the entry; a failure sets `failed`; a second `start` while downloading doesn't call `installResource` again. Mock `@/core/sync`.

**3b. `TafsirDownloadList`** in `src/features/reader/panels/`, with its colocated test.
- **Props:** `items: { resourceId, title, subtitle, state: DownloadRowState, progress }[]`, plus `onDownload(id)`, `onCancel(id)`, `onOpen(id)` and `testID`. It only renders; the panel computes the subtitles.
- **Layout from `#TafsirDownload`:**
  - **Intro line:** «نزّل تفسيرًا لقراءته بدون إنترنت», no full stop. Use the new key `reader.tafsir.downloadIntro`, and in English "Download a tafsir to read it offline". Style it as `UiText` `variant="label"`, `weight={400}`, `tone="muted"`, line height `size.creditLineHeight` (12/18 in the frame), with a horizontal inset of `size.frameInset` (6).
  - **Card:** one card holding every row. Draw it inside this component: `radius.lg` (20), `colors.surfaceRaised`, a `stroke.hairline` border in `colors.line` (from `useContrastColors`), `overflow: 'hidden'`, and no padding. `Card` has no zero padding, so don't use it.
  - **Rows:** one `DownloadRow` per item, with `showDivider` on every row except the last.
  - **Gap:** `size.sheetGap` between the header area, the intro line and the card.
- **Test:** render; each row state (available, downloading with progress, installed); each press calls the right callback with the id; RTL in ar and en; the progress bar's `accessibilityValue`; button labels; no hex.

**3c. Panel wiring** (`TafsirPanel`, `AyahPanelContent`, `panel-data.ts`)
- **Data:**
  - Add `loadCatalogTafsirOptions(db)` to `panel-data.ts`, returning `TafsirOption & { installed: boolean; packSizeBytes: number }`.
  - Merge in installed tafsirs that are missing from the catalogue (installs from before the catalogue existed), with `installed: true` and size 0.
  - Re-read when `installedVersion` from the store changes; add it to the `useMemo` deps. Today the list is read once per executor.
- **Subtitle:** build it in a small pure function, `tafsirRowSubtitle`, with its own test.
  - Parts are `[status?, author?, size?]`, joined with « · ».
  - Status is «جارٍ التنزيل» (`ui.download.downloading`) or «تعذّر التنزيل» (`ui.download.failed`).
  - Size is `ui.download.size` («{{size}} م.ب» / "{{size}} MB"). It's `packSizeBytes / 1e6` to one decimal, through `formatNumber`, which gives «٫» in Arabic. Leave it out when the size is 0.
  - Add every new string to both `ar.json` and `en.json`.
- **State (a), nothing readable: the list.**
  - **Readable** means installed and not waiting for «عرض».
  - **The latch:** `AyahPanelContent` keeps `awaitingOpen: Set<number>`. An id goes in when the store reports it installed during this panel's life, and comes out when its «عرض» is tapped.
  - **List mode** holds while no tafsir is readable. This keeps the list on screen after the first download finishes: that row shows «عرض» and waits for a tap (approved). Tapping «عرض» sets `pickedTafsirId` and shows the passage.
  - **What renders:** the same header as today (`PanelHeader`), then `TafsirDownloadList`. No chips, no ayah card and no stepper; the frame draws none.
  - **Side panel:** same content with `layout="panel"`. No tablet frame exists; the plan approved "follows the side-panel layout".
- **State (b), at least one readable: chips from the catalogue.**
  - The chips list every catalogue tafsir, installed or not, so the "Installed tafsirs only" comment on `tafsirs` changes.
  - `tafsirIdInUse` accepts a picked id that isn't installed.
  - **A chip that isn't installed, or is waiting for «عرض»:** keep the ayah card. Replace the name row, the passage and the credit with one card holding a single `DownloadRow` for that tafsir, styled like the list's card («تنزيل» → progress → «عرض»). «عرض» removes it from `awaitingOpen`, and the passage appears. The stepper stays.
- **Offline (no catalogue, nothing installed):** keep the current `EmptyState`. Its action becomes a retry, using the new key `reader.tafsir.retry` («إعادة المحاولة» / "Try again"). The retry calls `runDeviceContentSync()` (export it from `core/sync` if it isn't exported yet), then re-reads.
- **Remove:**
  - The `downloadTafsirId` and `onDownload` props, and the `onDownload={(id) => setTafsirId(id)}` wiring. It never downloaded anything.
  - `reader.tafsir.download`, once nothing references it.
  - `installResource` already makes the first download the reader's settings choice; the panel doesn't call `setTafsirId`.
- **Tests:**
  - Update `TafsirPanel.test.tsx` and `AyahPanelContent.test.tsx`, and add `panel-data` cases.
  - Nothing installed: the list shows, and no chips, ayah card or stepper are drawn.
  - Tapping «تنزيل» calls the store's `start(id)`.
  - A download finishes: the row shows «عرض» and the list stays.
  - «عرض» shows the passage.
  - An uninstalled chip shows its `DownloadRow` in place of the passage.
  - A failed download's subtitle starts with «تعذّر التنزيل».
  - Offline with no catalogue: the empty state with a retry.
  - Run every test in ar and en.
- **Gate:** the mobile gates above.

### Review (orchestrator)
- **Diff:** check each part's diff against this brief and spec §6, §7 and §12.
- **Frame:** check part 3 against `#TafsirDownload`, rendered with `python3 packages/design-tokens/scripts/frame-shot.py TafsirDownload <out.png>`, and against a screenshot from the iPhone 17 simulator (`xcrun simctl io booted screenshot`) of the tafsir sheet with nothing installed.
- **Prelive data:** prelive serves one Arabic tafsir (Jalalayn), so the screenshot has one row where the frame has four. That's the data, not a mismatch. Compare the row itself: type, insets, pill, divider, card radius and the intro line.
- **Getting state (a):** if Jalalayn is already installed on the simulator, state (a) won't appear. Delete the app's `content.db` (or reinstall the app) and let the first sync write the catalogue before opening the sheet.
- **States to screenshot:**
  - Available.
  - Downloading: the stop button and the bar, which fills from the right in Arabic.
  - Installed, showing «عرض».
  - The passage after «عرض».
- **After it lands:** update the step 13 row in `README.md` and the Status in `../phase-2.md`.
