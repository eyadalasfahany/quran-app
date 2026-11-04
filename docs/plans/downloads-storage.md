# Downloads & storage screen

**Branch:** `main` (no feature branch; this screen was listed as Phase 3 step 7 / deferred full screen).  
**Frame:** `#Downloads` in `quran-app-screens.html` (gx-cap «التنزيلات والمساحة»).  
**Spec sections:** §4 (structure), §6 (SQLite schema), §12 (reader/audio/search), §15 (delivery plan step 7).  
**Related ADRs:** 0010 (HTML designs win), 0013 (screens-html-wins), 0027 (local-only), 0011 (fonts), 0008 (audio URLs).

---

## What already exists

| Thing | Where | Notes |
|---|---|---|
| Route placeholder | `app/settings/downloads.tsx` | **Does not exist yet** |
| Feature folder | `src/features/downloads/` | **Does not exist yet** |
| Settings entry | `ListeningSection` row + `onPressDownloads` prop | Exists but `SettingsScreen` never passes the prop |
| Audio size (per surah) | `downloads.size_bytes` in `user.db` | Actual bytes from `Content-Length` |
| Audio grouping | `listDownloads()`, `listDownloadsForReciter()`, `useDoneCountsByReciter()` | In `features/audio/data/downloads.ts` |
| Download-all | `enqueueAll(reciterResourceId)` | In `features/audio/downloads/manager.ts` |
| Font files | `Paths.document/qcf-v2/p{N}.ttf` | 604 pages; helper `fontDirectory()` is private in `fonts.ts` |
| Tafsir size | `catalog_resources.pack_size_bytes` | Available for every installed tafsir via `listCatalogTafsirs()` in `reader/data/tafsir.ts` |
| Tafsir install | `installResource(id, …)` in `core/sync` | No uninstall yet |
| `DownloadRow` | `shared/ui/DownloadRow.tsx` | Reuse for reciter rows |
| `megabytes()` helper | `features/azkar/audio/downloads.ts` | Move to a shared util or re-export |
| Azkar downloads | `features/azkar/screens/AzkarDownloadsScreen.tsx` | Separate screen; do **not** merge |

---

## How to measure each bucket

### 1 التلاوات — audio recordings

```
SELECT SUM(size_bytes) FROM downloads WHERE status = 'done'
```
`user.db` via Drizzle. `size_bytes` is the real file size (Content-Length at download time).  
Per-reciter summary: group by `reciter_resource_id`, count rows with `status = 'done'` (surah count), sum `size_bytes`.  
Hook: `useAudioStorageSummary()` → `useLiveQuery` (auto-updates as downloads complete).

### 2 خطوط المصحف — mushaf fonts

No DB record exists. Must scan the filesystem.  
`new Directory(Paths.document, 'qcf-v2').list()` → filter `*.ttf` (exclude `*.part`) → sum `file.info().size`.  
Up to 604 files. Call once on mount, cache in component state; no polling needed (fonts only change on revalidation which happens at app launch, not during the session).  
Expose `fontDirectoryPath()` from `features/reader/mushaf/fonts.ts` (currently private as `fontDirectory()`).

### 3 التفاسير — tafsir packs

`catalog_resources.pack_size_bytes` is the compressed download size — the only stored proxy. It is slightly smaller than the on-disk SQLite rows but avoids a filesystem scan. Use it.  
Hook: `useTafsirStorageSummary()` → calls `listCatalogTafsirs(db)`, filters `installed: true`, maps `packSizeBytes`.  
**No schema change needed.**

---

## Decisions (developer, 3 Nov 2026 — all recommendations accepted)

| # | Decision |
|---|---|
| **D1** | **Yes** — ship «تنزيل الكل» in v1 (`enqueueAll` already exists) |
| **D2** | **Defer** — no delete UI for tafsir in v1 (or disabled «قريبًا»); no `uninstallTafsir` yet |
| **D3** | **Yes** — Settings trailing shows live total via `useStorageTotals` (hook only while Settings mounted) |
| **D4** | **`packSizeBytes`** — tafsir size from catalog, no FS scan |

---

## v1 scope vs. deferred

| Feature | v1? | Notes |
|---|---|---|
| Storage card (total + segmented bar + legend) | ✅ | All three buckets |
| التلاوات section: reciter rows (name, surah count, size) | ✅ | |
| «تنزيل الكل» pill | ✅ D1 | |
| In-progress stop button (reciter-level) | ✅ | pause active transfer via manager |
| النصوص section: عثماني حفص row (أساسي · لا يمكن حذفه) | ✅ | No action |
| Tafsir rows (name, size) | ✅ | |
| «حذف التفسير» action | ⏸ D2 deferred | No delete UI in v1 |
| Footer auto-update note | ✅ | |
| Settings trailing live size | ✅ D3 | |
| Mushaf font delete | ❌ | Frame marks it «لا يمكن حذفه» |
| Azkar audio downloads card | ❌ | Separate screen, ADR 0040 |

---

## File layout

```
apps/mobile/
  app/settings/downloads.tsx                     # route — thin; reads no params

  src/features/downloads/
    screens/
      DownloadsScreen.tsx
      DownloadsScreen.test.tsx
    components/
      StorageCard.tsx                            # total + segmented bar + legend
      StorageCard.test.tsx
      StorageSegmentBar.tsx                      # 3-color bar (audio, fonts, tafsir)
      StorageSegmentBar.test.tsx
      ReciterStorageRow.tsx                      # name · surah count · size, download-all / stop
      ReciterStorageRow.test.tsx
      MushafsTextSection.tsx                     # النصوص: Hafs row + tafsir rows
      MushafsTextSection.test.tsx
      TafsirStorageRow.tsx                       # tafsir name · pack size · delete (or disabled)
      TafsirStorageRow.test.tsx
      DownloadsFooterNote.tsx                    # footer copy
      DownloadsFooterNote.test.tsx
    hooks/
      useStorageTotals.ts                        # { audioBytes, fontBytes, tafsirBytes, totalBytes }
      useStorageTotals.test.ts
      useAudioStorageSummary.ts                  # live; per-reciter + total
      useAudioStorageSummary.test.ts
      useTafsirStorageSummary.ts                 # installed tafsirs with packSizeBytes
      useTafsirStorageSummary.test.ts
      useFontStorageBytes.ts                     # async FS scan; settles once on mount
      useFontStorageBytes.test.ts

  src/features/reader/mushaf/fonts.ts            # expose fontDirectoryPath() (currently private)
```

No API changes. No `openapi.json` update. No new npm packages.

---

## i18n keys

Namespace `downloads` (extends existing keys under `downloads.*` in `ar.json` / `en.json`):

| Key | Arabic | English |
|---|---|---|
| `downloads.screen.storage` | «المساحة المستخدمة» | "Storage used" *(reuse existing `downloads.storage`)* |
| `downloads.screen.legend.audio` | «التلاوات» | "Recitations" |
| `downloads.screen.legend.fonts` | «خطوط المصحف» | "Mushaf fonts" |
| `downloads.screen.legend.tafsir` | «التفاسير» | "Tafsirs" |
| `downloads.screen.reciters` | «التلاوات» | "Recitations" |
| `downloads.screen.reciterSurahCount` | «{{count}} سورة» | "{{count}} surahs" |
| `downloads.screen.downloadAll` | «تنزيل الكل» | "Download all" |
| `downloads.screen.stop` | «إيقاف» | "Stop" |
| `downloads.screen.texts` | «النصوص» | "Texts" |
| `downloads.screen.hafsLabel` | «عثماني حفص» | "Uthmani Hafs" |
| `downloads.screen.hafsSubtitle` | «أساسي · لا يمكن حذفه» | "Core · cannot be deleted" |
| `downloads.screen.deleteTafsir` | «حذف التفسير» | "Delete tafsir" |
| `downloads.screen.deleteTafsirTitle` | «حذف {{name}}؟» | "Delete {{name}}?" |
| `downloads.screen.deleteTafsirBody` | «سيُحذف هذا التفسير من جهازك. يمكن تنزيله مجددًا لاحقًا.» | "This tafsir will be deleted from your device. You can download it again later." |
| `downloads.screen.deleteTafsirConfirm` | «حذف» | "Delete" |
| `downloads.screen.footerNote` | «تُحدَّث النصوص المثبَّتة تلقائيًا كل أسبوع» | "Installed texts update automatically every week" |

Existing keys to reuse without change:
- `settings.listening.downloads` → screen title «التنزيلات والمساحة»
- `downloads.megabytes` → `"{{value}} م.ب"` for size labels

---

## Step list

Each step is small enough to review separately. Implement in order; hand off each to a Haiku implementer.

### Step 1 — Expose font directory path + measurement hooks
**Files touched:**
- `features/reader/mushaf/fonts.ts` — add exported `fontDirectoryPath(): string` (returns `'qcf-v2'`; thin wrapper over private `fontDirectory()`)
- `features/downloads/hooks/useFontStorageBytes.ts` — async FS scan; returns `{ bytes: number; loading: boolean }`
- `features/downloads/hooks/useAudioStorageSummary.ts` — `useLiveQuery` over `downloads`; returns `{ perReciter: { reciterResourceId, surahCount, bytes }[]; totalBytes: number }`
- `features/downloads/hooks/useTafsirStorageSummary.ts` — reads `listCatalogTafsirs`, filters installed; returns `{ perTafsir: { resourceId, nameAr, packSizeBytes }[]; totalBytes: number }`
- `features/downloads/hooks/useStorageTotals.ts` — composes above three; returns `{ audioBytes, fontBytes, tafsirBytes, totalBytes, loading }`

**Tests:**
- `useFontStorageBytes.test.ts` — mock `Directory`, verify sum, empty-dir case
- `useAudioStorageSummary.test.ts` — mock Drizzle, verify per-reciter grouping and total
- `useTafsirStorageSummary.test.ts` — mock `listCatalogTafsirs`, verify filtering and sum
- `useStorageTotals.test.ts` — mock all three hooks, verify total

**Gates:** `tsc`, `jest`, no lint errors.

---

### Step 2 — Wire Settings entry
**Files touched:**
- `features/settings/screens/SettingsScreen.tsx` — import `useStorageTotals`; pass `onPressDownloads={() => router.push('/settings/downloads')}` and `downloadsTrailing={formattedTotal}` to `ListeningSection`
- `features/settings/components/ListeningSection.tsx` — add optional `downloadsTrailing?: string` prop; render it instead of the static `t('settings.listening.downloadsValue')`; add `chevron` to the downloads row (it already has `chevron={Boolean(onPressDownloads)}`)
- `features/settings/components/ListeningSection.test.tsx` — add test: downloads row navigates; trailing shows custom string

**Tests:**
- `ListeningSection.test.tsx` — existing test for static trailing still passes; new test asserts custom trailing renders
- `SettingsScreen.test.tsx` — downloads row has `chevron`; pressing navigates (mock router)

**Gates:** same.

---

### Step 3 — StorageSegmentBar + StorageCard components
**Files touched:**
- `features/downloads/components/StorageSegmentBar.tsx` — 3-segment proportional bar (audio / fonts / tafsir colors from design tokens); zero-total shows a neutral bar; `accessibilityLabel` summarises the three values
- `features/downloads/components/StorageCard.tsx` — `Card` wrapping: title «المساحة المستخدمة», total size, `StorageSegmentBar`, three-row legend (colored dot, label, size)

**Tests per component:**
- Render with values, with zeros, with loading state
- RTL: legend rows flip
- Accessibility: role, label
- Token check: no raw hex

**Gates:** same.

---

### Step 4 — ReciterStorageRow component
**Files touched:**
- `features/downloads/components/ReciterStorageRow.tsx` — name (nameAr fallback to name), subtitle «{{count}} سورة · {{size}}», trailing pill: «تنزيل الكل» when idle / «إيقاف» while `enqueueAll` is running (detect via `useDownloadProgress`'s active reciter)

**Tests:**
- Idle state: pill shows «تنزيل الكل», press calls `onDownloadAll`
- Downloading state: pill shows «إيقاف», press calls `onStop`
- RTL
- Accessibility

**Gates:** same.

---

### Step 5 — TafsirStorageRow + MushafsTextSection components
**Files touched:**
- `features/downloads/components/TafsirStorageRow.tsx` — nameAr + size; if D2 = ship: delete icon button + `ConfirmDialog`; if D2 = defer: no delete UI (or disabled icon with accessibility hint)
- `features/downloads/components/MushafsTextSection.tsx` — non-deletable Hafs row (ListRow with subtitle «أساسي · لا يمكن حذفه»), then `TafsirStorageRow` per installed tafsir; footer note `DownloadsFooterNote`
- `features/downloads/components/DownloadsFooterNote.tsx` — `UiText tone="muted"` with the auto-update copy

**Tests per component** (same matrix as above).

**If D2 = ship, also add:**
- `uninstallTafsir(resourceId)` in `features/reader/data/tafsir.ts` (or `core/sync`) — one SQL transaction: `DELETE FROM installed_resources WHERE resource_id = ?` + `DELETE FROM tafsir_entries WHERE resource_id = ?`
- `uninstallTafsir.test.ts`

**Gates:** same; add a test for uninstall if implemented.

---

### Step 6 — DownloadsScreen + i18n keys
**Files touched:**
- `features/downloads/screens/DownloadsScreen.tsx` — `Screen > ContentColumn > ScrollView` with: `DownloadsHeader` (back + title), `StorageCard`, `SettingsGroup` «التلاوات» with `ReciterStorageRow` per reciter that has ≥1 done download, `SettingsGroup` «النصوص» via `MushafsTextSection`
- `features/downloads/screens/DownloadsScreen.test.tsx`
- `src/core/i18n/locales/ar.json` — add all new `downloads.screen.*` keys
- `src/core/i18n/locales/en.json` — ditto

**Tests:**
- Renders with no downloads: storage card shows 0, sections empty or absent
- Renders with downloads: reciter rows and tafsir rows appear
- RTL snapshot
- Back navigation

**Gates:** same; all i18n keys present in both locales.

---

### Step 7 — Route
**Files touched:**
- `app/settings/downloads.tsx` — 4-line route: `import { DownloadsScreen }; export default function Page() { return <DownloadsScreen />; }`

**Gates:** `expo-doctor` passes; `tsc`.

---

### Step 8 — Visual check (exit criterion)
1. `python3 packages/design-tokens/scripts/frame-shot.py Downloads downloads-frame.png` — render at 390×844.
2. `xcrun simctl io booted screenshot downloads-sim.png` — capture running app on iPhone 17 sim.
3. Compare side-by-side. Every section, color, spacing, and label must match the frame exactly. Differences require developer approval and an ADR note.

---

## Tests matrix (per step)

| Component / hook | Render defaults | Variants/props | Interaction | RTL | A11y | Token check |
|---|---|---|---|---|---|---|
| `useFontStorageBytes` | ✅ | empty dir, partial files | — | — | — | — |
| `useAudioStorageSummary` | ✅ | zero downloads | live-query update | — | — | — |
| `useTafsirStorageSummary` | ✅ | none installed | — | — | — | — |
| `useStorageTotals` | ✅ | all zero | loading state | — | — | — |
| `ListeningSection` | ✅ | with/without trailing | press navigates | ✅ | ✅ | ✅ |
| `StorageSegmentBar` | ✅ | zero total | — | ✅ | ✅ | ✅ |
| `StorageCard` | ✅ | loading | — | ✅ | ✅ | ✅ |
| `ReciterStorageRow` | ✅ | idle/downloading | download-all, stop | ✅ | ✅ | ✅ |
| `TafsirStorageRow` | ✅ | with/without delete | delete confirm | ✅ | ✅ | ✅ |
| `MushafsTextSection` | ✅ | no tafsirs | — | ✅ | ✅ | ✅ |
| `DownloadsFooterNote` | ✅ | — | — | ✅ | ✅ | ✅ |
| `DownloadsScreen` | ✅ | empty state | back nav | ✅ | ✅ | — |

---

## Release blockers

- [x] Developer answered D1–D4 (3 Nov 2026): all recommendations
- [ ] Visual check passes (step 8) — `tmp/downloads-frame.png` rendered; iPhone 17 sim compare still needs macOS
- [x] Downloads suites green (hooks, components, screen, Settings, cancelReciter)
- [x] All `downloads.screen.*` i18n keys present in both `ar.json` and `en.json`
- [x] `settings.listening.downloads` row navigates to `/settings/downloads` (not a sheet)
- [x] Screen composes only (DownloadsHeader, RecitersStorageSection extracted)

---

## ADR

No new ADR is required. All decisions are within the approved frame (`#Downloads`), use existing infrastructure, and require no schema changes. If D2 (delete tafsir) is accepted, record a one-line note in `docs/adr/README.md` under Phase 3 follow-ups.
