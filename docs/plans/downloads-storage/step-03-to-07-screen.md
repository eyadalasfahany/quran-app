# Steps 3–7 — Downloads screen UI, i18n, route

**Branch:** `main`  
**Design frame:** `#Downloads` in `quran-app-screens.html` (lines 4925–4984)  
**Hooks already built (steps 1–2):**  
`features/downloads/hooks/{useStorageTotals,useAudioStorageSummary,useTafsirStorageSummary,useFontStorageBytes}.ts`  
**Settings row wired (step 2):** route `/settings/downloads`, live trailing in `ListeningSection`.

---

## Locked decisions

| # | Decision |
|---|---|
| D1 | Ship «تنزيل الكل» via `enqueueAll(reciterResourceId)` |
| D2 | **Omit delete UI entirely in v1.** `TafsirStorageRow` shows no delete button and no «قريبًا» text. |
| D3 | Live total already done in Settings (step 2). |
| D4 | Tafsir size = `packSizeBytes` from catalog; no filesystem scan. |

---

## Frame deviations (pre-approved)

| Deviation | Reason |
|---|---|
| Sub-screen title uses `displayMd` (28 px Amiri) not the frame's 26 px | Matches all other sub-screens (`AzkarScreenHeader`). |
| Downloading reciter row subtitle shows «جارٍ التنزيل» (no specific surah name) | Resolving surah name requires cross-DB audioFileId→chapterId join not justified for v1. |
| Tafsir row subtitle shows pack size in MB (not «آخر تحديث: اليوم») | D4: pack-size only; no update-date column available. |
| TafsirStorageRow has no delete button | D2. |

---

## Color tokens for the segment bar

From `packages/design-tokens/src/colors.ts` — no raw hex in components:

| Segment | Frame RGB | Token | Light value |
|---|---|---|---|
| Audio / التلاوات | `rgb(31, 77, 64)` | `theme.colors.brand` | `#1f4d40` ✓ |
| Fonts / خطوط المصحف | `rgb(160, 124, 51)` | `theme.colors.gold` | `#a07c33` ✓ |
| Tafsir / التفاسير | `rgb(79, 134, 168)` | `theme.colors.chartBlue` | `#4f86a8` ✓ |
| Bar track | `rgb(239, 232, 216)` | `theme.colors.fillSecondary` | `#efe8d8` ✓ |
| Legend dot gap between segments | — | `theme.space[1]` (= 4 px, gap: 2 in frame — **open question below**) | — |

> **Open question OQ-1 (bar gap):** Frame shows `gap: 2px` between segments.  
> `theme.space` minimum is 4. Use **`2`** as a raw literal for this gap only (it is not a color or a radius — the no-raw-hex rule covers colors; the rule for spacing tokens says to derive spacing from `theme.space`, but 2 is not in the table). If the developer prefers adding a `space[0.5]: 2` token, add it to `scale.ts` first and update this component. Default: use raw `2`.

---

## New scale tokens — add to `packages/design-tokens/src/scale.ts` `size` object

Add these lines inside the `size = { … }` object (after `stopGlyph`):

```ts
// Storage screen (quran-app-screens.html, #Downloads).
storageBarHeight: 10,      // height of the three-segment bar
storageBarRadius: 5,       // end-cap radius of the bar (= storageBarHeight / 2)
storageDotSize: 10,        // legend color square
storageDotRadius: 3,       // legend color square corner
reciterStorageRowMinHeight: 60, // idle reciter row min-height
```

No other tokens change.

---

## New shared utility — `src/core/format/megabytes.ts` (create)

```ts
const BYTES_PER_MEGABYTE = 1024 * 1024;

/**
 * Converts bytes to megabytes with one decimal, as the storage summaries show.
 * Returns 0 for non-finite or non-positive inputs.
 */
export function megabytes(bytes: number): number {
  if (!Number.isFinite(bytes) || bytes <= 0) return 0;
  return Math.round((bytes / BYTES_PER_MEGABYTE) * 10) / 10;
}
```

**Also update `src/features/azkar/audio/downloads.ts`:** replace the local `megabytes` function + its constant with:

```ts
export { megabytes } from '@/core/format/megabytes';
```

(Re-export so existing callers of `azkar/audio/downloads` don't break.)

---

## New manager export — `cancelReciter` — `src/features/audio/downloads/manager.ts`

Add after `enqueueAll`:

```ts
/**
 * Cancels every queued, downloading, paused or wifi-waiting transfer for a reciter without
 * deleting the already-done rows. The stop button on ReciterStorageRow calls this.
 */
export function cancelReciter(reciterResourceId: number): void {
  const CANCELABLE: DownloadStatus[] = ['queued', 'downloading', 'paused', 'waiting_wifi'];
  for (const row of listDownloadsForReciter(reciterResourceId, userStore())) {
    if (CANCELABLE.includes(row.status)) {
      cancel(row.audioFileId); // cancel calls discard + pump; multiple pump calls are idempotent
    }
  }
}
```

Import `DownloadStatus` from `../data/downloads` (already imported as part of `DownloadRow`).

---

## i18n — both `src/core/i18n/locales/ar.json` and `en.json`

Add a new **top-level** `"downloads"` key (separate from `azkar.downloads.*`).  
Insert it alphabetically after `"common"` or wherever the file's top-level object is ordered.

### ar.json

```json
"downloads": {
  "megabytes": "{{value}} م.ب",
  "screen": {
    "storage": "المساحة المستخدمة",
    "legend": {
      "audio": "التلاوات",
      "fonts": "خطوط المصحف",
      "tafsir": "التفاسير"
    },
    "reciters": "التلاوات",
    "reciterSurahCount": "{{count}} سورة",
    "downloadAll": "تنزيل الكل",
    "stop": "إيقاف",
    "downloadAllA11y": "تنزيل كل سور {{name}}",
    "stopA11y": "إيقاف تنزيل {{name}}",
    "downloading": "جارٍ التنزيل",
    "texts": "النصوص",
    "hafsLabel": "الرسم العثماني · حفص",
    "hafsSubtitle": "أساسي · لا يمكن حذفه",
    "footerNote": "النصوص المحمّلة تُحدَّث تلقائيًا كل أسبوع على الأقل عند الاتصال بالإنترنت."
  }
}
```

### en.json

```json
"downloads": {
  "megabytes": "{{value}} MB",
  "screen": {
    "storage": "Storage used",
    "legend": {
      "audio": "Recitations",
      "fonts": "Mushaf fonts",
      "tafsir": "Tafsirs"
    },
    "reciters": "Recitations",
    "reciterSurahCount": "{{count}} surahs",
    "downloadAll": "Download all",
    "stop": "Stop",
    "downloadAllA11y": "Download all of {{name}}",
    "stopA11y": "Stop downloading {{name}}",
    "downloading": "Downloading",
    "texts": "Texts",
    "hafsLabel": "Uthmani Hafs",
    "hafsSubtitle": "Core · cannot be deleted",
    "footerNote": "Installed texts update automatically at least once a week when connected to the internet."
  }
}
```

> **Note:** `downloads.megabytes` matches `azkar.downloads.megabytes` exactly. Settings can switch to `downloads.megabytes` later. The new `DownloadsScreen` always uses `downloads.megabytes`; the azkar screen keeps `azkar.downloads.megabytes` unchanged.

---

## Step 3 — `StorageSegmentBar` + `StorageCard`

### `src/features/downloads/components/StorageSegmentBar.tsx` (create)

**Props:**

```ts
type Props = {
  audioBytes: number;   // bytes used by audio recordings
  fontBytes: number;    // bytes used by mushaf fonts
  tafsirBytes: number;  // bytes used by tafsir packs
  testID?: string;
};
```

**Behaviour:**

- Compute `total = audioBytes + fontBytes + tafsirBytes`.
- If `total === 0`, render the track (fillSecondary) as a single rounded bar with no segments — do not divide by zero.
- Otherwise render three segments with `width: \`${(bytes / total) * 100}%\`` for each non-zero bucket. Zero-byte buckets render with `width: 0`, which collapses them cleanly.
- Segments: `flexDirection: 'row'`, `height: theme.size.storageBarHeight`, `borderRadius: theme.size.storageBarRadius`, `overflow: 'hidden'`, `backgroundColor: theme.colors.fillSecondary`, `gap: 2` (see OQ-1).
- Segment colors (read from `useTheme().colors`): audio → `brand`, fonts → `gold`, tafsir → `chartBlue`.
- `accessibilityElementsHidden` / `aria-hidden`: the bar is decorative; the card's `accessibilityLabel` carries the summary. Set `aria-hidden="true"` on the outer `View` (`importantForAccessibility="no-hide-descendants"` on Android, `accessible={false}` on iOS via React Native's `accessible={false}`).

**Style values:**

| Property | Value | Token |
|---|---|---|
| height | 10 | `theme.size.storageBarHeight` |
| borderRadius | 5 | `theme.size.storageBarRadius` |
| gap between segments | 2 | raw literal (OQ-1) |
| track background | fillSecondary | `theme.colors.fillSecondary` |

---

### `src/features/downloads/components/StorageCard.tsx` (create)

**Props:**

```ts
type Props = {
  audioBytes: number;
  fontBytes: number;
  tafsirBytes: number;
  totalBytes: number;
  loading: boolean;
  testID?: string;
};
```

**Layout (from frame):**

```
Card (surfaceRaised, line border, radius lg, padding 4 = 16 pt, gap 10):
  Row (justify-content: space-between, align-items: baseline):
    UiText variant="headline"           → t('downloads.screen.storage')
    UiText variant="caption" tone="muted" → loading ? '…' : t('downloads.megabytes', { value: formatNumber(megabytes(totalBytes), locale) })
  StorageSegmentBar (audioBytes, fontBytes, tafsirBytes)
  Legend grid (2-column, gap: 6px row / 12px col, font-size 12 = label):
    [audio dot + t('downloads.screen.legend.audio') + ' · ' + size]
    [fonts dot + t('downloads.screen.legend.fonts') + ' · ' + size]
    [tafsir dot + t('downloads.screen.legend.tafsir') + ' · ' + size]
```

**Legend rows:** three `View` elements with `flexDirection: 'row'`, `alignItems: 'center'`, `gap: theme.space[1] + 2` (= 6, matching frame). Each has:
- A color square: `width: theme.size.storageDotSize`, `height: theme.size.storageDotSize`, `borderRadius: theme.size.storageDotRadius`, `backgroundColor: theme.colors.<token>`.
- `UiText variant="label" weight={400}`: `"{label} · {size}"` where size = `t('downloads.megabytes', { value: ... })`.

**Legend layout:** use `flexWrap: 'wrap'` with `flexDirection: 'row'` and `columnGap: theme.space[3]` (= 12) and `rowGap: theme.space[1] + 2` (= 6). Each legend item has `width: '45%'` so two fit per row — matching frame's 2-column grid.

> **Accessibility:** The whole Card has `accessibilityLabel` = `\`{t('downloads.screen.storage')}: {totalMB}. {audio}: {audioMB}. {fonts}: {fontsMB}. {tafsir}: {tafsirMB}.\`` assembled from the formatted values (no t() interpolation needed; compose the string). Set `accessible={true}` on the outer Card.

**Imports:** `megabytes` from `@/core/format/megabytes`, `formatNumber` from `@/core/i18n/numbers`, `useLocale` from `@/core/i18n/useLocale`, `useTheme` from `@/core/theme`, `useTranslation`, `Card`, `UiText` from `@/shared/ui`, `StorageSegmentBar` (sibling), `useContrastColors` from `@/shared/ui`.

---

## Step 4 — `ReciterStorageRow`

### `src/features/downloads/components/ReciterStorageRow.tsx` (create)

**Props:**

```ts
type Props = {
  name: string;           // display name (already locale-resolved by screen)
  surahCount: number;     // completed downloads
  bytes: number;          // total bytes of completed downloads
  isDownloading: boolean; // true when this reciter has queued or active transfers
  downloadProgress: number; // 0–1; only used when isDownloading = true
  onDownloadAll: () => void;
  onStop: () => void;
  showDivider?: boolean;
  testID?: string;
};
```

**Layout (from frame):**

```
Row: flexDirection row, alignItems center, gap theme.space[3] (12),
     minHeight theme.size.reciterStorageRowMinHeight (60),
     paddingHorizontal theme.size.downloadRowInset (14)
  Content column: flex 1, gap 2
    UiText variant="headline": name
    UiText variant="label" weight={400} tone="muted":
      isDownloading ? t('downloads.screen.downloading')
                    : t('downloads.screen.reciterSurahCount', { count: surahCount })
                      + ' · '
                      + t('downloads.megabytes', { value: formatNumber(megabytes(bytes), locale) })
    // Only when isDownloading = true:
    Progress bar (View, height progressHeight 4, borderRadius radius.progress 2,
                  background fillSecondary, marginTop size.progressGap 6):
      Fill View (width `${percent}%`, height progressHeight, borderRadius radius.progress,
                 background theme.colors.brand)
  Trailing:
    isDownloading=false → Pill Pressable («تنزيل الكل»):
      minHeight: size.touchTarget (44), paddingHorizontal space[3] (12),
      borderRadius radius.pill (999), borderWidth stroke.hairline,
      borderColor colors.line, backgroundColor colors.surfaceRaised,
      color brand, font caption weight 600
    isDownloading=true  → Stop Pressable (circle):
      width: size.touchTarget (44), height: size.touchTarget (44),
      borderRadius: size.touchTarget / 2 (22), borderWidth stroke.hairline,
      borderColor colors.line, backgroundColor colors.surfaceRaised
      Inner square: width size.stopGlyph (7) / BUT frame shows 14×14 rect at 24 dp circle.
      ⚠ Frame stop button is 44×44 disc; inner rect is 14×14 (frame says `width="14" height="14"`).
      Use 14 as inner rect size. Token `size.stopGlyph` = 7 is for the DownloadRow progress stop.
      Use raw `14` for this rect OR add a token (open question OQ-2 below).
      backgroundColor: colors.ink, borderRadius: radius.glyph (1)
```

> **Open question OQ-2 (stop rect size):** Frame shows a 14×14 px filled rectangle inside the 44 dp stop disc on the ReciterStorageRow. `size.stopGlyph` = 7 is used for DownloadRow's inline stop. Use raw literal `14` for the reciter stop rect, or add `size.reciterStopGlyph: 14` to scale.ts. Default: raw `14`.

**Accessibility:**
- Pill Pressable: `accessibilityRole="button"`, `accessibilityLabel={t('downloads.screen.downloadAllA11y', { name })}`
- Stop Pressable: `accessibilityRole="button"`, `accessibilityLabel={t('downloads.screen.stopA11y', { name })}`
- Progress bar `View`: `accessibilityRole="progressbar"`, `accessibilityValue={{ min: 0, max: 100, now: Math.round(downloadProgress * 100) }}`, `accessible={true}`

**Imports:** `megabytes` from `@/core/format/megabytes`, `formatNumber` from `@/core/i18n/numbers`, `useLocale`, `useTheme`, `useContrastColors`, `UiText`, `useTranslation`, `Pressable`, `View` from `react-native`.

**Separator:** when `showDivider={true}`, add `borderBottomColor: colors.line, borderBottomWidth: theme.stroke.hairline` to the row style (same pattern as `DownloadRow.tsx`).

---

## Step 5 — `TafsirStorageRow`, `MushafsTextSection`, `DownloadsFooterNote`

### `src/features/downloads/components/TafsirStorageRow.tsx` (create)

**Props:**

```ts
type Props = {
  nameAr: string | null;    // null → use resourceId.toString() as fallback label
  packSizeBytes: number;
  showDivider?: boolean;
  testID?: string;
};
```

**Layout:** mirrors the Hafs row — a non-pressable `View`, same dimensions as `downloadRowMinHeight` = 56 (existing token), `paddingHorizontal: size.downloadRowInset` (14), `flexDirection: 'row'`, `alignItems: 'center'`, `gap: space[3]`.

```
Content column (flex 1, gap 2):
  UiText variant="headline": nameAr ?? String(resourceId) — but resourceId is not in props.
  UiText variant="label" weight={400} tone="muted":
    t('downloads.megabytes', { value: formatNumber(megabytes(packSizeBytes), locale) })
```

> **D2:** No delete button. No disabled button. No «قريبًا». The row is purely informational.

**Separator:** `showDivider` → hairline bottom border (`colors.line`).

---

### `src/features/downloads/components/MushafsTextSection.tsx` (create)

**Props:**

```ts
type Props = {
  tafsirs: Array<{ resourceId: number; nameAr: string | null; packSizeBytes: number }>;
  testID?: string;
};
```

**Layout:** no outer `SettingsGroup` here; this component renders the Card directly so the Hafs row and tafsir rows share a single Card with overflow:hidden (matching the frame's single rounded card for the «النصوص» section).

```
View (gap space[1]+2 = 6, same as SettingsGroup):
  UiText accessibilityRole="header" variant="caption" weight={600} tone="muted"
         marginHorizontal=space[1]+2=6: t('downloads.screen.texts')
  Card-like View (surfaceRaised, line border, radius lg, overflow: 'hidden', no padding):
    Hafs row (View, minHeight 56 − from existing token downloadRowMinHeight,
              paddingHorizontal downloadRowInset 14, flexDirection row, alignItems center,
              gap space[3], borderBottom hairline line — always shown since tafsir rows follow):
      Content col (flex 1, gap 2):
        UiText variant="headline": t('downloads.screen.hafsLabel')
        UiText variant="label" weight={400} tone="muted": t('downloads.screen.hafsSubtitle')
    TafsirStorageRow × tafsirs.length
      (showDivider = index < tafsirs.length - 1 for inner dividers; no divider on last)
    DownloadsFooterNote (rendered outside the card, below it — see frame line 4984)
```

> Wait — looking at the frame: the footer note (`<p>` at line 4984) is **outside** the card (`<div>` that ends at line 4981). `DownloadsFooterNote` should be rendered by the **screen**, not inside `MushafsTextSection`. Update the brief accordingly:

**Revised `MushafsTextSection`:** renders the section heading + the card with Hafs row + tafsir rows. It does NOT render `DownloadsFooterNote` — the screen renders it after the section.

---

### `src/features/downloads/components/DownloadsFooterNote.tsx` (create)

**Props:** none (content is fixed i18n string).

```tsx
export function DownloadsFooterNote({ testID }: { testID?: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <UiText
      style={{ marginHorizontal: theme.space[1] + 2, lineHeight: 18 }}
      testID={testID}
      tone="muted"
      variant="label"
      weight={400}
    >
      {t('downloads.screen.footerNote')}
    </UiText>
  );
}
```

Style: `font-size: 12px; line-height: 18px; color: inkMuted` = `variant="label" weight={400} tone="muted"` + explicit `lineHeight: 18` (label lineHeight is 16; frame shows 18px — use inline style for the 2px difference).  
Left/right margin: `space[1] + 2` = 6 (same as SettingsGroup title, matching the frame's `margin: 0 6px`).

---

## Step 6 — `DownloadsScreen` + i18n keys

### `src/features/downloads/screens/DownloadsScreen.tsx` (create)

**Imports:**
- `useTranslation` from `react-i18next`
- `ScrollView, View` from `react-native`
- `router` from `expo-router`
- `ContentColumn` from `@/core/layout`
- `useContentDb` from `@/core/db/content/open`
- `openUserDb` from `@/core/db/user/open`
- `useLocale` from `@/core/i18n/useLocale`
- `formatNumber` from `@/core/i18n/numbers`
- `megabytes` from `@/core/format/megabytes`
- `useTheme` from `@/core/theme`
- `Screen` from `@/shared/ui`
- `BackButton` from `@/shared/ui`
- `UiText` from `@/shared/ui`
- `useAudioStorageSummary` from `../hooks/useAudioStorageSummary`
- `useFontStorageBytes` from `../hooks/useFontStorageBytes`
- `useTafsirStorageSummary` from `../hooks/useTafsirStorageSummary`
- `enqueueAll, cancelReciter` from `@/features/audio/downloads/manager`
- `useDownloadProgress` from `@/features/audio/downloads/store`
- `useReciterCatalogue` from `@/features/audio/hooks/useReciterCatalogue`
- `reciterDisplayName` from `@/features/audio/reciter-list`
- `useLiveQuery` from `drizzle-orm/expo-sqlite`
- `downloads as downloadsTable` from `@/core/db/user/schema`
- `inArray` from `drizzle-orm`
- `StorageCard` (sibling)
- `ReciterStorageRow` (sibling)
- `MushafsTextSection` (sibling)
- `DownloadsFooterNote` (sibling)

**Data wiring:**

```ts
const { t } = useTranslation();
const locale = useLocale();
const theme = useTheme();
const { ready } = useContentDb();
const { reciters } = useReciterCatalogue(ready);

// Storage totals (for StorageCard)
const audio = useAudioStorageSummary();           // { perReciter, totalBytes }
const { bytes: fontBytes, loading } = useFontStorageBytes();
const tafsir = useTafsirStorageSummary();          // { perTafsir, totalBytes }
const totalBytes = audio.totalBytes + fontBytes + tafsir.totalBytes;

// Which reciters are actively downloading? (live, reactive)
const { db } = openUserDb();
const { data: inProgressRows } = useLiveQuery(
  db
    .selectDistinct({ reciterResourceId: downloadsTable.reciterResourceId })
    .from(downloadsTable)
    .where(inArray(downloadsTable.status, ['queued', 'downloading', 'paused', 'waiting_wifi'])),
);
const activeReciterIds = new Set((inProgressRows ?? []).map((r) => r.reciterResourceId));

// Overall download progress for the active transfer (one transfer at a time)
const progressById = useDownloadProgress((s) => s.byId);
const downloadingProgress = Object.values(progressById)[0] ?? 0;
```

**Reciter row data:** join `audio.perReciter` with `reciters` catalog:

```ts
const reciterRows = audio.perReciter.map((r) => {
  const catalog = reciters.find((c) => c.resourceId === r.reciterResourceId);
  return {
    reciterResourceId: r.reciterResourceId,
    name: reciterDisplayName(
      catalog ?? { name: null, nameAr: null },
      locale,
      t('listen.unnamed'),   // fallback label — key already exists
    ),
    surahCount: r.surahCount,
    bytes: r.bytes,
  };
});
```

**Screen layout:**

```tsx
<Screen testID={testID}>
  <ContentColumn gutter={theme.space[4] /* 16 */}>
    <ScrollView contentContainerStyle={{ gap: theme.space[4], paddingBottom: theme.space[8] }}>

      {/* Header row */}
      <View style={{ alignItems: 'center', flexDirection: 'row', gap: theme.space[2] }}>
        <BackButton onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(main)/(settings)'); }} />
        <UiText accessibilityRole="header" variant="displayMd">
          {t('settings.listening.downloads')}
        </UiText>
      </View>

      {/* Storage card */}
      <StorageCard
        audioBytes={audio.totalBytes}
        fontBytes={fontBytes}
        loading={loading}
        tafsirBytes={tafsir.totalBytes}
        totalBytes={totalBytes}
        testID="downloads-storage-card"
      />

      {/* التلاوات section (only if there are reciter rows) */}
      {reciterRows.length > 0 ? (
        <View style={{ gap: theme.space[1] + 2 }}>
          <UiText
            accessibilityRole="header"
            style={{ marginHorizontal: theme.space[1] + 2 }}
            tone="muted"
            variant="caption"
            weight={600}
          >
            {t('downloads.screen.reciters')}
          </UiText>
          <View
            style={{
              backgroundColor: theme.colors.surfaceRaised,
              borderColor: colors.line,
              borderRadius: theme.radius.lg,
              borderWidth: theme.stroke.hairline,
              overflow: 'hidden',
            }}
          >
            {reciterRows.map((row, index) => (
              <ReciterStorageRow
                bytes={row.bytes}
                downloadProgress={activeReciterIds.has(row.reciterResourceId) ? downloadingProgress : 0}
                isDownloading={activeReciterIds.has(row.reciterResourceId)}
                key={row.reciterResourceId}
                name={row.name}
                onDownloadAll={() => enqueueAll(row.reciterResourceId)}
                onStop={() => cancelReciter(row.reciterResourceId)}
                showDivider={index < reciterRows.length - 1}
                surahCount={row.surahCount}
                testID={`reciter-storage-row-${row.reciterResourceId}`}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* النصوص section */}
      <MushafsTextSection
        tafsirs={tafsir.perTafsir}
        testID="downloads-mushaf-section"
      />

      {/* Footer note */}
      <DownloadsFooterNote testID="downloads-footer-note" />

    </ScrollView>
  </ContentColumn>
</Screen>
```

> `colors` = `useContrastColors()` — add this hook call in the screen.

**Screen props:**

```ts
export function DownloadsScreen({ testID = 'screen-downloads' }: { testID?: string }) { … }
```

**Back navigation fallback route:** `'/(main)/(settings)'` — verify this matches the existing settings tab route in `app/` folder structure. If the fallback differs, adjust to match. (Check `app/(main)/(settings)/index.tsx` exists; if not, use `router.replace('/(main)' as Href)`.)

---

### `src/features/downloads/screens/DownloadsScreen.test.tsx` (create)

Tests to write:

| Test | What to verify |
|---|---|
| Renders with no downloads | StorageCard shows (testID `downloads-storage-card` present), no reciter rows, mushaf section renders |
| Renders with reciter rows | `reciter-storage-row-{id}` present for each row from mock `useAudioStorageSummary` |
| Renders with tafsir rows | TafsirStorageRow appears inside mushaf section |
| Footer note present | `downloads-footer-note` testID found |
| Back button navigates | Press `back-button` → `router.back()` called (mock router) |
| RTL snapshot | Render with `I18nManager.isRTL = true`; snapshot matches |

**Mocks needed:**
- `useAudioStorageSummary` → mock return value
- `useFontStorageBytes` → mock return value
- `useTafsirStorageSummary` → mock return value
- `useReciterCatalogue` → mock return value
- `useLiveQuery` (drizzle-orm/expo-sqlite) → mock empty + with rows
- `useDownloadProgress` (zustand) → mock `byId: {}`
- `openUserDb` → mock (return a `db` with `.selectDistinct()` chain)
- `router` from expo-router → mock `back` and `canGoBack`

---

## Step 7 — Route

### `apps/mobile/app/settings/downloads.tsx` (create)

```ts
import { DownloadsScreen } from '@/features/downloads/screens/DownloadsScreen';

export default function SettingsDownloadsRoute() {
  return <DownloadsScreen />;
}
```

Four lines. No params. No logic.

---

## Component test matrix

Each component's own `.test.tsx` covers:

| Component | Render default | Variants/props | Interaction | RTL | A11y role+label | No raw hex |
|---|---|---|---|---|---|---|
| `StorageSegmentBar` | ✅ all-zero | three buckets with values; one zero bucket | — | ✅ | accessible=false check | ✅ |
| `StorageCard` | ✅ loading=true | loading=false with values | — | ✅ | accessibilityLabel format | ✅ |
| `ReciterStorageRow` | ✅ idle | isDownloading=true; progress 0/0.5/1 | onDownloadAll called; onStop called | ✅ | pill a11y label; stop a11y label | ✅ |
| `TafsirStorageRow` | ✅ nameAr present | nameAr=null | — | ✅ | role | ✅ |
| `MushafsTextSection` | ✅ no tafsirs | one tafsir; two tafsirs | — | ✅ | header role on section title | ✅ |
| `DownloadsFooterNote` | ✅ renders | — | — | ✅ | — | ✅ |

**"No raw hex" test pattern** (copy from existing component tests):

```ts
it('uses no raw hex colors', () => {
  const { toJSON } = render(<ComponentName … />);
  const json = JSON.stringify(toJSON());
  expect(json).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
});
```

---

## Full file list

### Create

| Path | Purpose |
|---|---|
| `packages/design-tokens/src/scale.ts` | +5 tokens |
| `apps/mobile/src/core/format/megabytes.ts` | shared util |
| `apps/mobile/src/features/downloads/components/StorageSegmentBar.tsx` | bar |
| `apps/mobile/src/features/downloads/components/StorageSegmentBar.test.tsx` | test |
| `apps/mobile/src/features/downloads/components/StorageCard.tsx` | card |
| `apps/mobile/src/features/downloads/components/StorageCard.test.tsx` | test |
| `apps/mobile/src/features/downloads/components/ReciterStorageRow.tsx` | reciter row |
| `apps/mobile/src/features/downloads/components/ReciterStorageRow.test.tsx` | test |
| `apps/mobile/src/features/downloads/components/TafsirStorageRow.tsx` | tafsir row |
| `apps/mobile/src/features/downloads/components/TafsirStorageRow.test.tsx` | test |
| `apps/mobile/src/features/downloads/components/MushafsTextSection.tsx` | النصوص section |
| `apps/mobile/src/features/downloads/components/MushafsTextSection.test.tsx` | test |
| `apps/mobile/src/features/downloads/components/DownloadsFooterNote.tsx` | footer |
| `apps/mobile/src/features/downloads/components/DownloadsFooterNote.test.tsx` | test |
| `apps/mobile/src/features/downloads/screens/DownloadsScreen.tsx` | screen |
| `apps/mobile/src/features/downloads/screens/DownloadsScreen.test.tsx` | test |
| `apps/mobile/app/settings/downloads.tsx` | route |

### Change

| Path | Change |
|---|---|
| `apps/mobile/src/features/azkar/audio/downloads.ts` | Re-export `megabytes` from `@/core/format/megabytes` |
| `apps/mobile/src/features/audio/downloads/manager.ts` | Add `cancelReciter()` export |
| `apps/mobile/src/core/i18n/locales/ar.json` | Add top-level `"downloads"` block |
| `apps/mobile/src/core/i18n/locales/en.json` | Add top-level `"downloads"` block |

---

## Out of scope

- Delete tafsir (D2 — omit entirely in v1).
- Surah-level chapter name in the downloading subtitle (acceptable frame deviation; see top of brief).
- Mushaf font delete button (frame marks it «لا يمكن حذفه»).
- Azkar downloads card (separate screen `AzkarDownloadsScreen`, ADR 0040).
- Visual check (step 8) — screenshot vs. frame, separate step after implementation.
- Dark / sepia theme screenshots — colors come from tokens; only verify light.

---

## Open questions (answer before coding, or use defaults above)

| # | Question | Default |
|---|---|---|
| OQ-1 | Segment bar gap = 2 px; not a space token. Add `space[0.5]: 2` to `scale.ts` or use raw `2`? | Use raw `2` |
| OQ-2 | Stop rect inside the reciter stop disc is 14×14. Add `size.reciterStopGlyph: 14` to `scale.ts` or use raw `14`? | Use raw `14` |
| OQ-3 | Fallback route from DownloadsScreen back button: confirm `'/(main)/(settings)'` is the correct Expo Router href for the settings tab root. Check `app/(main)/` structure. | Verify before coding |
| OQ-4 | `listen.unnamed` i18n key used as reciter name fallback — confirm this key exists in both locales. If not, add it or use empty string. | Check first; use `''` if missing |

---

## Gates

Run after all files are written:

```bash
cd apps/mobile

# Type check
rtk tsc

# Lint
rtk lint

# Tests
rtk test src/features/downloads src/core/format src/features/azkar/audio src/features/audio/downloads

# Design-tokens type check
cd ../../packages/design-tokens && rtk tsc
```

All must pass with zero errors before handing off.

---

## Reference code locations (verified to exist)

| Symbol | File |
|---|---|
| `useAudioStorageSummary()` | `src/features/downloads/hooks/useAudioStorageSummary.ts` |
| `useFontStorageBytes()` | `src/features/downloads/hooks/useFontStorageBytes.ts` |
| `useTafsirStorageSummary()` | `src/features/downloads/hooks/useTafsirStorageSummary.ts` |
| `useStorageTotals()` | `src/features/downloads/hooks/useStorageTotals.ts` |
| `enqueueAll(reciterResourceId)` | `src/features/audio/downloads/manager.ts` line 398 |
| `cancel(audioFileId)` | `src/features/audio/downloads/manager.ts` line 427 |
| `useDownloadProgress` (Zustand) | `src/features/audio/downloads/store.ts` line 10 |
| `useReciterCatalogue(ready)` | `src/features/audio/hooks/useReciterCatalogue.ts` |
| `reciterDisplayName(names, locale, fallback)` | `src/features/audio/reciter-list.ts` line 65 |
| `listDownloadsForReciter(reciterResourceId, store)` | `src/features/audio/data/downloads.ts` line 139 |
| `megabytes(bytes)` | `src/features/azkar/audio/downloads.ts` line 55 (move to `src/core/format/megabytes.ts`) |
| `formatNumber(value, locale)` | `src/core/i18n/numbers.ts` |
| `useLocale()` | `src/core/i18n/useLocale.ts` |
| `SettingsGroup` | `src/features/settings/components/SettingsGroup.tsx` |
| `BackButton` | `src/shared/ui/BackButton.tsx` |
| `DownloadRow` | `src/shared/ui/DownloadRow.tsx` — **do not reuse** for ReciterStorageRow; the designs differ |
| `Card` | `src/shared/ui/Card.tsx` |
| `UiText` | `src/shared/ui/UiText.tsx` |
| `Screen` | `src/shared/ui/Screen.tsx` |
| `ContentColumn` | `src/core/layout/ContentColumn.tsx` |
| `AzkarDownloadsScreen` | `src/features/azkar/screens/AzkarDownloadsScreen.tsx` — reference pattern only |
| `downloads` Drizzle schema | `src/core/db/user/schema.ts` (has `status`, `reciterResourceId` columns) |
