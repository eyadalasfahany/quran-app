# Step 2 — Wire Settings entry

**Goal:** Show a live storage total in the Settings screen's «التنزيلات والمساحة» row and make it
navigate to `/settings/downloads`. No new components, no schema changes, no API changes.

**Step 1 is done.** The hooks already exist:

| Hook | File | Returns |
|---|---|---|
| `useStorageTotals` | `src/features/downloads/hooks/useStorageTotals.ts` | `{ audioBytes, fontBytes, tafsirBytes, totalBytes, loading }` |
| `useAudioStorageSummary` | `src/features/downloads/hooks/useAudioStorageSummary.ts` | `{ perReciter, totalBytes }` |
| `useFontStorageBytes` | `src/features/downloads/hooks/useFontStorageBytes.ts` | `{ bytes, loading }` |
| `useTafsirStorageSummary` | `src/features/downloads/hooks/useTafsirStorageSummary.ts` | `{ perTafsir, totalBytes }` |

---

## Files to change

### 1 `src/features/settings/components/ListeningSection.tsx`

**Absolute path:** `apps/mobile/src/features/settings/components/ListeningSection.tsx`

**What it is now:** renders a downloads `ListRow` with a static `UiText` reading
`t('settings.listening.downloadsValue')` (Arabic: «إدارة التنزيلات»).

**Change:** add one optional prop `downloadsTrailing?: string`.

#### Exact prop addition

```ts
// Add to the props destructure (after onPressDownloads):
  downloadsTrailing?: string;
```

Add it to the prop-type object:

```ts
  downloadsTrailing?: string;
```

#### Exact JSX change inside the downloads `ListRow`

Replace the existing `trailing` on the downloads row:

```tsx
// BEFORE
trailing={
  <UiText tone="muted" variant="subhead">
    {t('settings.listening.downloadsValue')}
  </UiText>
}
```

```tsx
// AFTER
trailing={
  <UiText tone="muted" variant="subhead">
    {downloadsTrailing ?? t('settings.listening.downloadsValue')}
  </UiText>
}
```

No other line changes. The `chevron={Boolean(onPressDownloads)}` that is already there stays.

---

### 2 `src/features/settings/screens/SettingsScreen.tsx`

**Absolute path:** `apps/mobile/src/features/settings/screens/SettingsScreen.tsx`

**What it is now:** renders `<ListeningSection onPressReciter={…} />` — no `onPressDownloads`.

**Changes:**

#### 2a — Import `useStorageTotals`

Add below the existing `useReaderSettings` import line:

```ts
import { useStorageTotals } from '@/features/downloads/hooks/useStorageTotals';
```

#### 2b — Derive the formatted total inside `SettingsScreen`

Add these lines inside the function body, after the `khatmaValue` `useMemo` block:

```ts
const { totalBytes, loading: storageLoading } = useStorageTotals();
const formattedTotal = storageLoading
  ? undefined
  : t('downloads.megabytes', {
      value: formatNumber(megabytes(totalBytes), locale),
    });
```

`formatNumber` is already imported (`import { formatNumber, useLocale } from '@/core/i18n'`).
`megabytes` is NOT yet imported — see §3 below.
`t` and `locale` are already in scope.

#### 2c — Pass props to `ListeningSection`

```tsx
// BEFORE
<ListeningSection
  onPressReciter={() => router.navigate('/(main)/(listen)' as Href)}
/>
```

```tsx
// AFTER
<ListeningSection
  downloadsTrailing={formattedTotal}
  onPressDownloads={() => router.push('/settings/downloads' as Href)}
  onPressReciter={() => router.navigate('/(main)/(listen)' as Href)}
/>
```

---

### 3 — Re-export `megabytes` from a shared location

**Current location:** `megabytes(bytes: number): number` lives in
`src/features/azkar/audio/downloads.ts` (line 57). It is not exported from any shared module.

**Decision (no new file):** import it directly from the azkar module for now. The plan's
open question about moving it to a shared util is deferred to a later step. Do NOT copy
the function — import it.

```ts
import { megabytes } from '@/features/azkar/audio/downloads';
```

Add this import to `SettingsScreen.tsx`.

**If the linter flags a cross-feature import:** move `megabytes` to
`src/core/i18n/bytes.ts` (new file, < 15 lines) exporting only `megabytes`, update
`features/azkar/audio/downloads.ts` to re-export it from there, and import it from
`@/core/i18n/bytes` in `SettingsScreen.tsx`. Do this only if the linter actually fails —
do not do it preemptively.

---

## i18n keys

Both keys already exist in `ar.json` and `en.json`. No new keys needed.

| Key | ar.json value | en.json value |
|---|---|---|
| `downloads.megabytes` | `"{{value}} م.ب"` | `"{{value}} MB"` |
| `settings.listening.downloadsValue` | `"إدارة التنزيلات"` | `"Manage downloads"` |

The `downloadsValue` key is kept in both locale files and is still used as the fallback
when `downloadsTrailing` is `undefined` (e.g. while `storageLoading` is true).

---

## Behaviour rules

| Condition | Displayed trailing |
|---|---|
| `storageLoading === true` | `undefined` → falls back to `t('settings.listening.downloadsValue')` (static text) |
| `totalBytes === 0` | `"٠ م.ب"` (ar) / `"0 MB"` (en) — show 0, not loading text |
| `totalBytes > 0` | formatted megabytes, e.g. `"١٢٫٣ م.ب"` (ar) / `"12.3 MB"` (en) |
| Route | `router.push('/settings/downloads' as Href)` — push, not navigate |

The `megabytes` function (from azkar/downloads.ts) already handles the byte→MB conversion:
`Math.round((bytes / (1024 * 1024)) * 10) / 10`. One decimal place. Returns `0` for
`bytes ≤ 0`.

`formatNumber` converts the decimal number to Arabic-Indic digits in Arabic and leaves it as
Western digits in English. It also converts the decimal separator to `٫` in Arabic.

The `chevron` on the downloads row is already `chevron={Boolean(onPressDownloads)}` in the
existing `ListeningSection` — once `onPressDownloads` is passed it will be `true` automatically.
Do not add a separate `chevron` prop.

---

## Tests

### `ListeningSection.test.tsx` — add 2 tests

**File:** `apps/mobile/src/features/settings/components/ListeningSection.test.tsx`

Existing tests must keep passing without change.

**New test 1 — custom trailing replaces static text:**

```ts
it('shows downloadsTrailing when provided', async () => {
  const view = await renderUi(<ListeningSection downloadsTrailing="١٢٫٣ م.ب" />);

  expect(view.getByText('١٢٫٣ م.ب')).toBeOnTheScreen();
  expect(view.queryByText('إدارة التنزيلات')).toBeNull();
});
```

**New test 2 — static fallback when downloadsTrailing is omitted:**

The existing test `'shows the downloads trailing value when no navigation handler is provided'`
already covers this (`expect(view.getByText('إدارة التنزيلات'))`). Do not duplicate it.

**New test 3 — navigation:**

The existing test `'calls onPressDownloads when downloads row is pressed'` already covers this.
Do not duplicate it.

---

### `SettingsScreen.test.tsx` — add 2 tests

**File:** `apps/mobile/src/features/settings/screens/SettingsScreen.test.tsx`

Add a mock for `useStorageTotals` in the jest mock block at the top:

```ts
jest.mock('@/features/downloads/hooks/useStorageTotals', () => ({
  useStorageTotals: () => ({
    audioBytes: 0,
    fontBytes: 0,
    tafsirBytes: 0,
    totalBytes: 12_582_912, // 12 MB
    loading: false,
  }),
}));
```

**New test 1 — downloads row navigates to `/settings/downloads`:**

```ts
it('opens downloads screen from the downloads row', async () => {
  const view = await renderUi(<SettingsScreen />);

  fireEvent.press(view.getByTestId('listening-downloads-row'));

  expect(router.push).toHaveBeenCalledWith('/settings/downloads');
});
```

**New test 2 — trailing shows live total:**

```ts
it('shows the live storage total in the downloads row trailing', async () => {
  const view = await renderUi(<SettingsScreen />);

  // 12_582_912 bytes = 12 MB; formatted as Arabic-Indic in ar locale
  expect(view.getByText('١٢ م.ب')).toBeOnTheScreen();
});
```

`megabytes(12_582_912)` = `Math.round((12_582_912 / 1_048_576) * 10) / 10` = 12.0 →
`formatNumber(12, 'ar')` = `'١٢'` → `t('downloads.megabytes', { value: '١٢' })` = `'١٢ م.ب'`.

**Existing tests:** all existing `SettingsScreen` tests must keep passing.

---

## Out of scope for this step

- The `/settings/downloads` route itself (Step 7).
- The `DownloadsScreen` and all its components (Steps 3–7).
- Moving `megabytes` to a shared util (deferred; only move if the linter forces it).
- Any schema or API change.
- Any new i18n keys.

---

## Gates

Run from `apps/mobile/`:

```bash
npm run lint && npx tsc --noEmit && npm test -- --testPathPattern="ListeningSection|SettingsScreen"
```

All three must exit 0. No new lint errors or type errors anywhere in `features/settings/`.
