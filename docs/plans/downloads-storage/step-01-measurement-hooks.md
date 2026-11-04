# Step 1 — Expose font directory path + measurement hooks

**Branch:** `main`  
**Parent plan:** `docs/plans/downloads-storage.md`  
**Locked decisions:** D1 yes download-all · D2 defer delete-tafsir · D3 live Settings trailing · D4 packSizeBytes for tafsir  
**Gates:** `npm run lint && npx tsc --noEmit && npm test` — all must be green. No UI components, no route, no i18n keys.

---

## Goal

Produce the four measurement hooks that every later step consumes, and export the font directory path from
`fonts.ts`. No UI, no route, no i18n keys. All return types are `readonly`-safe plain objects; no React state
other than the `useState` inside `useFontStorageBytes`.

---

## Files to create or change

```
apps/mobile/src/
  features/reader/mushaf/fonts.ts                           CHANGE — add one export
  features/downloads/hooks/useFontStorageBytes.ts           CREATE
  features/downloads/hooks/useFontStorageBytes.test.ts      CREATE
  features/downloads/hooks/useAudioStorageSummary.ts        CREATE
  features/downloads/hooks/useAudioStorageSummary.test.ts   CREATE (file extension .tsx — uses renderHook)
  features/downloads/hooks/useTafsirStorageSummary.ts       CREATE
  features/downloads/hooks/useTafsirStorageSummary.test.ts  CREATE
  features/downloads/hooks/useStorageTotals.ts              CREATE
  features/downloads/hooks/useStorageTotals.test.ts         CREATE (file extension .tsx — uses renderHook)
```

`features/downloads/` does not exist yet; the implementer creates the folder tree.

---

## 1 · `features/reader/mushaf/fonts.ts` — add `fontDirectoryPath()`

The private `fontDirectory()` at line 320 returns `new Directory(Paths.document, 'qcf-v2')`.
`fontDirectoryPath()` returns only the relative segment `'qcf-v2'` so callers can build a
`Directory` with the same `Paths.document` base without duplicating the path literal.

**Add exactly this export** anywhere before the private helpers, after the existing public exports:

```ts
/**
 * The sub-path inside `Paths.document` where QCF v2 font files are stored.
 * Used by measurement hooks that scan the directory without loading fonts.
 */
export function fontDirectoryPath(): string {
  return 'qcf-v2';
}
```

No other change to `fonts.ts`. Do **not** change the private `fontDirectory()` function.

---

## 2 · `useFontStorageBytes.ts`

### Purpose
Scans the font directory once on mount. Returns total bytes of `*.ttf` files (excludes `*.ttf.part`).

### Imports available
- `Directory`, `File`, `Paths` from `'expo-file-system'` (already a project dependency; SDK 58)
- `fontDirectoryPath` from `'@/features/reader/mushaf/fonts'`
- `useState`, `useEffect` from `'react'`

### Return type

```ts
export type FontStorageBytesResult = {
  /** Sum of bytes of all *.ttf files in the font directory. 0 while loading. */
  bytes: number;
  /** True until the scan has settled (including when the directory does not exist). */
  loading: boolean;
};
```

### Implementation

```ts
import { Directory, Paths } from 'expo-file-system';
import { useEffect, useState } from 'react';

import { fontDirectoryPath } from '@/features/reader/mushaf/fonts';

export type FontStorageBytesResult = { bytes: number; loading: boolean };

export function useFontStorageBytes(): FontStorageBytesResult {
  const [result, setResult] = useState<FontStorageBytesResult>({ bytes: 0, loading: true });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const dir = new Directory(Paths.document, fontDirectoryPath());
        let total = 0;
        if (dir.exists) {
          for (const item of dir.list()) {
            // item is File | Directory; only File has .size
            if ('size' in item && typeof item.name === 'string' && item.name.endsWith('.ttf')) {
              total += (item as { size: number }).size;
            }
          }
        }
        if (!cancelled) {
          setResult({ bytes: total, loading: false });
        }
      } catch {
        if (!cancelled) {
          setResult({ bytes: 0, loading: false });
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return result;
}
```

**Behaviour rules:**
- `.ttf.part` files are partial downloads; they have names ending in `.ttf.part` — excluded because
  the `.name.endsWith('.ttf')` check is false for `.ttf.part`.
- If the directory does not exist (fonts never downloaded), returns `{ bytes: 0, loading: false }`.
- Errors (permission, unavailable filesystem) are caught; returns `{ bytes: 0, loading: false }`.
- Runs once per mount; no polling. Fonts only change at app launch revalidation, not mid-session.
- `cancelled` flag guards against setting state after unmount.

**Type note:** `expo-file-system` SDK 58 `Directory.list()` returns `(File | Directory)[]`. `File`
has `.name: string` and `.size: number`. Access `.size` only after confirming the item has it (the
`'size' in item` guard above), or cast to `File` after the name check.

---

## 3 · `useAudioStorageSummary.ts`

### Purpose
Live (updates as downloads complete) per-reciter summary of `done` audio files from `user.db`.

### Imports available
- `openUserDb` from `'@/core/db/user/open'` — returns `{ db: UserDatabase, executor: SqlExecutor }`;
  `db` is the Drizzle instance used by `useLiveQuery`.
- `useLiveQuery` from `'drizzle-orm/expo-sqlite'`
- `downloads` (table) from `'@/core/db/user/schema'`
- `eq`, `sum`, `count`, `sql` from `'drizzle-orm'`
- `useMemo` from `'react'`

### Return type

```ts
export type ReciterAudioSummary = {
  reciterResourceId: number;
  surahCount: number;   // rows with status = 'done' for this reciter
  bytes: number;        // SUM(size_bytes) for done rows; 0 when all size_bytes are NULL
};

export type AudioStorageSummaryResult = {
  perReciter: ReciterAudioSummary[];
  totalBytes: number;
};
```

### SQL (via Drizzle ORM)

```ts
const { db } = openUserDb();
const { data } = useLiveQuery(
  db
    .select({
      reciterResourceId: downloads.reciterResourceId,
      surahCount: count(),
      bytes: sql<number>`COALESCE(SUM(${downloads.sizeBytes}), 0)`,
    })
    .from(downloads)
    .where(eq(downloads.status, 'done'))
    .groupBy(downloads.reciterResourceId),
);
```

`data` is `undefined` before the first query run; treat as `[]`.

### useMemo shape

```ts
return useMemo((): AudioStorageSummaryResult => {
  const perReciter = (data ?? []).map((row) => ({
    reciterResourceId: row.reciterResourceId,
    surahCount: row.surahCount,
    bytes: row.bytes,
  }));
  const totalBytes = perReciter.reduce((acc, r) => acc + r.bytes, 0);
  return { perReciter, totalBytes };
}, [data]);
```

**Behaviour rules:**
- `size_bytes` can be NULL in the `downloads` table (`sizeBytes: number | null` in `DownloadRow`);
  `COALESCE(SUM(...), 0)` returns 0 in that case.
- Result updates whenever the `downloads` table changes (Drizzle live query on `expo-sqlite`
  change events).
- Reciters with zero done rows are absent from `perReciter`.

---

## 4 · `useTafsirStorageSummary.ts`

### Purpose
Reads installed tafsirs from `content.db` catalog and returns size data. **Not live** — tafsir
installs happen at app launch sync; the hook reads once per render triggered by a parent.

### Imports available
- `openContentDb` from `'@/core/db/content/open'` — returns `{ db, executor: SqlExecutor }`
- `listCatalogTafsirs` from `'@/features/reader/data/tafsir'`
  - signature: `listCatalogTafsirs(db: SqlExecutor): CatalogTafsir[]`
  - `CatalogTafsir` has `{ resourceId: number; nameAr: string | null; packSizeBytes: number; installed: boolean; … }`
- `useMemo` from `'react'`

### Return type

```ts
export type TafsirSizeSummary = {
  resourceId: number;
  nameAr: string | null;
  packSizeBytes: number;
};

export type TafsirStorageSummaryResult = {
  perTafsir: TafsirSizeSummary[];
  totalBytes: number;
};
```

### Implementation

```ts
import { useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';
import { listCatalogTafsirs } from '@/features/reader/data/tafsir';

export type TafsirSizeSummary = { resourceId: number; nameAr: string | null; packSizeBytes: number };
export type TafsirStorageSummaryResult = { perTafsir: TafsirSizeSummary[]; totalBytes: number };

export function useTafsirStorageSummary(): TafsirStorageSummaryResult {
  return useMemo(() => {
    let rows;
    try {
      rows = listCatalogTafsirs(openContentDb().executor);
    } catch {
      return { perTafsir: [], totalBytes: 0 };
    }
    const perTafsir = rows
      .filter((r) => r.installed)
      .map((r) => ({ resourceId: r.resourceId, nameAr: r.nameAr, packSizeBytes: r.packSizeBytes }));
    const totalBytes = perTafsir.reduce((acc, r) => acc + r.packSizeBytes, 0);
    return { perTafsir, totalBytes };
  }, []);
}
```

**Behaviour rules:**
- Filters `installed === true`; non-installed catalog rows are excluded.
- `packSizeBytes` comes from `catalog_resources.pack_size_bytes` (D4); no filesystem scan.
- If `content.db` is not yet open (e.g., mounted before migration), the try/catch returns zeros.
- `useMemo` with `[]` deps runs once; parent is responsible for remounting when installs change.

---

## 5 · `useStorageTotals.ts`

### Purpose
Composes the three buckets into a single totals object. Step 2 (Settings trailing) and Step 3
(StorageCard) both import this hook.

### Return type

```ts
export type StorageTotalsResult = {
  audioBytes: number;
  fontBytes: number;
  tafsirBytes: number;
  totalBytes: number;
  /** True while useFontStorageBytes has not yet settled. */
  loading: boolean;
};
```

### Implementation

```ts
import { useFontStorageBytes } from './useFontStorageBytes';
import { useAudioStorageSummary } from './useAudioStorageSummary';
import { useTafsirStorageSummary } from './useTafsirStorageSummary';

export type StorageTotalsResult = {
  audioBytes: number;
  fontBytes: number;
  tafsirBytes: number;
  totalBytes: number;
  loading: boolean;
};

export function useStorageTotals(): StorageTotalsResult {
  const { bytes: fontBytes, loading } = useFontStorageBytes();
  const { totalBytes: audioBytes } = useAudioStorageSummary();
  const { totalBytes: tafsirBytes } = useTafsirStorageSummary();
  const totalBytes = audioBytes + fontBytes + tafsirBytes;
  return { audioBytes, fontBytes, tafsirBytes, totalBytes, loading };
}
```

**Behaviour rules:**
- `loading` is true until the font scan settles (font scan is the only async part).
- All three hooks are called unconditionally (no conditional hook calls).
- `totalBytes` is 0 while loading; callers should check `loading` before displaying it.

---

## Tests

### `useFontStorageBytes.test.ts`

Mock `expo-file-system` using the project's `FakeDirectory` / `FakeFile` from
`../../../../jest/fake-file-system` (path relative to the new test file in
`src/features/downloads/hooks/`).

```ts
import { renderHook } from '@testing-library/react-native';
import { act } from 'react';

import { resetFakeFileSystem, putFile, fakeExpoFileSystem } from '../../../../jest/fake-file-system';
import { useFontStorageBytes } from './useFontStorageBytes';

jest.mock('expo-file-system', () => fakeExpoFileSystem);
jest.mock('@/features/reader/mushaf/fonts', () => ({ fontDirectoryPath: () => 'qcf-v2' }));
```

**Test cases (all in one `describe('useFontStorageBytes')` block):**

1. **starts loading** — renders; `result.current.loading` is `true` immediately (before the `useEffect` micro-task).
2. **returns 0 and loading=false when directory is empty** — no files seeded; after `act(async () => {})`, `bytes === 0` and `loading === false`.
3. **sums ttf files** — seed `file:///documents/qcf-v2/p1.ttf` with 1000 bytes and `file:///documents/qcf-v2/p2.ttf` with 2000; after settling, `bytes === 3000`.
4. **excludes .part files** — seed a `.ttf` (1000) and a `.ttf.part` (999); `bytes === 1000`.
5. **returns 0 when the font directory does not exist** — no `putFile`, no `directories.add`; `bytes === 0`, `loading === false`.

Use `putFile(uri, size)` to add files to the in-memory FS, then `renderHook` and `act`.

### `useAudioStorageSummary.test.tsx`

Follow the pattern in
`src/features/audio/data/downloads-hooks.test.tsx` exactly:
- Same `mockChangeListeners` + `jest.mock('expo-sqlite', …)` pattern.
- `jest.mock('@/core/db/user/open', () => ({ openUserDb: () => mockUserDb }))`.
- `proxyDb(database)` with the same sqlite-proxy drizzle setup.
- Use `openUserTestStore()` from `../../../../jest/user-test-db`.
- Use `upsertDownload` from `@/features/audio/data/downloads` to seed rows.

**Test cases:**

1. **empty table** — `renderHook`, settle; `data.perReciter === []`, `data.totalBytes === 0`.
2. **counts done rows per reciter, excludes non-done** — insert done row for reciter 10 (sizeBytes 5000), done row for reciter 10 (sizeBytes 3000), queued row for reciter 10 (sizeBytes 999), done row for reciter 20 (sizeBytes 1000). After `writeAndEmit`, reciter 10 has `surahCount: 2, bytes: 8000`; reciter 20 has `surahCount: 1, bytes: 1000`; `totalBytes === 9000`.
3. **handles null sizeBytes** — done row with `sizeBytes: null`; `bytes === 0`, `totalBytes === 0`.
4. **live update** — result starts empty; after `writeAndEmit` it includes the new row.

### `useTafsirStorageSummary.test.ts`

No real DB needed; mock `listCatalogTafsirs` and `openContentDb`.

```ts
import { renderHook } from '@testing-library/react-native';
import { listCatalogTafsirs } from '@/features/reader/data/tafsir';
import { openContentDb } from '@/core/db/content/open';
import { useTafsirStorageSummary } from './useTafsirStorageSummary';

jest.mock('@/core/db/content/open', () => ({ openContentDb: jest.fn() }));
jest.mock('@/features/reader/data/tafsir', () => ({ listCatalogTafsirs: jest.fn() }));

const mockOpenContentDb = jest.mocked(openContentDb);
const mockListCatalogTafsirs = jest.mocked(listCatalogTafsirs);
```

**Test cases:**

1. **no installed tafsirs** — `listCatalogTafsirs` returns two rows both `installed: false`; result is `{ perTafsir: [], totalBytes: 0 }`.
2. **filters installed, maps packSizeBytes** — return three catalog rows: installed (packSizeBytes 10_000_000), not-installed (packSizeBytes 5_000_000), installed (packSizeBytes 8_000_000); `perTafsir` has 2 entries; `totalBytes === 18_000_000`.
3. **nameAr null propagates** — installed row with `nameAr: null`; entry has `nameAr: null`.
4. **openContentDb throws (DB not open)** — `mockOpenContentDb.mockImplementation(() => { throw new Error(); })`; result is `{ perTafsir: [], totalBytes: 0 }`.

Each test calls `renderHook` and reads `result.current` synchronously (no async, since `useMemo` is synchronous).

### `useStorageTotals.test.tsx`

Mock all three inner hooks.

```ts
import { renderHook } from '@testing-library/react-native';
import * as fontHook from './useFontStorageBytes';
import * as audioHook from './useAudioStorageSummary';
import * as tafsirHook from './useTafsirStorageSummary';
import { useStorageTotals } from './useStorageTotals';

jest.mock('./useFontStorageBytes');
jest.mock('./useAudioStorageSummary');
jest.mock('./useTafsirStorageSummary');

const mockFont  = jest.spyOn(fontHook,   'useFontStorageBytes');
const mockAudio = jest.spyOn(audioHook,  'useAudioStorageSummary');
const mockTafsir= jest.spyOn(tafsirHook, 'useTafsirStorageSummary');
```

**Test cases:**

1. **all zeros, loading=true** — font returns `{ bytes: 0, loading: true }`, audio `{ perReciter: [], totalBytes: 0 }`, tafsir `{ perTafsir: [], totalBytes: 0 }`; result: `{ audioBytes: 0, fontBytes: 0, tafsirBytes: 0, totalBytes: 0, loading: true }`.
2. **all zeros, loading=false** — font returns `{ bytes: 0, loading: false }`; `loading === false`.
3. **sums the three buckets** — audio 5000, font 3000, tafsir 2000; `totalBytes === 10000`.
4. **loading propagates from font** — font `loading: true`, others settled; `loading === true`.

---

## Existing code to reuse — do not duplicate

| Thing | File |
|---|---|
| `fontDirectory()` private | `features/reader/mushaf/fonts.ts:320` — leave as-is |
| `MUSHAF_PAGE_COUNT = 604` | `features/reader/mushaf/constants.ts:3` — do not import; no need in hooks |
| `openUserDb()` | `core/db/user/open.ts` |
| `openContentDb()` | `core/db/content/open.ts` |
| `downloads` Drizzle table | `core/db/user/schema` |
| `listCatalogTafsirs(db)` | `features/reader/data/tafsir.ts:100` |
| `CatalogTafsir` type | `features/reader/data/tafsir.ts:30` |
| `megabytes()` helper | `features/azkar/audio/downloads.ts:56` — do **not** import; this step has no formatting |
| `fakeExpoFileSystem` + helpers | `apps/mobile/jest/fake-file-system.ts` |
| `openUserTestStore()` | `apps/mobile/jest/user-test-db.ts` |
| downloads-hooks test pattern | `features/audio/data/downloads-hooks.test.tsx` |

---

## Out of scope for this step

- No UI components, no screens, no route.
- No i18n keys.
- No `megabytes()` formatting helper (used in later steps).
- No `enqueueAll` / download-all wiring (Step 4).
- No Settings trailing wiring (Step 2).
- No `openapi.json` update (no API change).
- No new npm packages.
- No `fontDirectoryPath` usage inside `fonts.ts` itself; the private `fontDirectory()` keeps its current shape.

---

## Gates

Run from `apps/mobile/`:

```bash
npm run lint
npx tsc --noEmit
npm test -- --testPathPattern="useFontStorageBytes|useAudioStorageSummary|useTafsirStorageSummary|useStorageTotals"
```

All must exit 0 with no errors. No other test file may break.
