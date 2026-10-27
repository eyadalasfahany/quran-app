import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { act, renderHook } from '@testing-library/react-native';

import { importSeedIfNeeded } from '@/core/db/content/seed';
import type { SqlExecutor } from '@/core/db/sql-executor';
import { storage, storageKeys } from '@/core/storage/mmkv';

import { applyContentMigrations } from '../../../../jest/apply-content-migrations';
import { openNodeSqlite } from '../../../../jest/node-sqlite-executor';
import { firstVerseOfPage, pageForVerse } from './page';
import { READING_ANCHOR_WRITE_MS, resolveInitialAnchor } from './reading-anchor';
import { useReadingAnchor } from './useReadingAnchor';

const migrationsDir = join(process.cwd(), 'src/core/db/content/migrations');
const seedPath = join(process.cwd(), 'assets/db/tanzil-seed.db');

jest.setTimeout(30_000);

function clearAnchor(): void {
  storage.remove(storageKeys.readerLastVerseKey);
  storage.remove(storageKeys.readerLastPage);
  storage.remove(storageKeys.readerMode);
}

beforeEach(() => {
  clearAnchor();
});

describe('resolveInitialAnchor', () => {
  it('prefers a route verse key, then the stored anchor, then 1:1', () => {
    storage.set(storageKeys.readerLastVerseKey, '3:1');
    storage.set(storageKeys.readerLastPage, '50');
    storage.set(storageKeys.readerMode, 'mushaf');

    expect(resolveInitialAnchor({ verseKey: '2:255' })).toEqual({
      verseKey: '2:255',
      page: null,
      mode: 'mushaf',
    });
    expect(resolveInitialAnchor({ verseKey: ' 2:255' })).toEqual({
      verseKey: '2:255',
      page: null,
      mode: 'mushaf',
    });
    expect(resolveInitialAnchor({ verseKey: 'nope' })).toEqual({
      verseKey: '3:1',
      page: 50,
      mode: 'mushaf',
    });
    expect(resolveInitialAnchor({ verseKey: '' })).toEqual({
      verseKey: '3:1',
      page: 50,
      mode: 'mushaf',
    });
    expect(resolveInitialAnchor({ verseKey: null })).toEqual({
      verseKey: '3:1',
      page: 50,
      mode: 'mushaf',
    });
    expect(resolveInitialAnchor()).toEqual({
      verseKey: '3:1',
      page: 50,
      mode: 'mushaf',
    });

    storage.set(storageKeys.readerLastPage, ' 50');
    storage.set(storageKeys.readerMode, 'gold');
    expect(resolveInitialAnchor()).toEqual({
      verseKey: '3:1',
      page: null,
      mode: 'reading',
    });

    clearAnchor();
    expect(resolveInitialAnchor()).toEqual({
      verseKey: '1:1',
      page: 1,
      mode: 'reading',
    });
    expect(READING_ANCHOR_WRITE_MS).toBe(1000);
  });
});

describe('useReadingAnchor', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('reads the stored anchor and does not write it again on mount', async () => {
    storage.set(storageKeys.readerLastVerseKey, '18:10');
    storage.set(storageKeys.readerLastPage, '50');
    storage.set(storageKeys.readerMode, 'focus');

    const { result } = await renderHook(() => useReadingAnchor());

    expect(result.current.verseKey).toBe('18:10');
    expect(result.current.page).toBe(50);
    expect(result.current.mode).toBe('focus');
    expect(storage.getString(storageKeys.readerLastVerseKey)).toBe('18:10');
  });

  it('throttles MMKV writes to once a second and keeps the latest position', async () => {
    const { result } = await renderHook(() => useReadingAnchor());
    jest.useFakeTimers();

    await act(() => {
      result.current.setVisible({ verseKey: '2:255', page: 42 });
    });
    expect(storage.getString(storageKeys.readerLastVerseKey)).toBe('2:255');
    expect(storage.getString(storageKeys.readerLastPage)).toBe('42');
    expect(storage.getString(storageKeys.readerMode)).toBe('reading');

    await act(() => {
      result.current.setVisible({ verseKey: '2:256' });
      result.current.setMode('mushaf');
    });
    expect(result.current.verseKey).toBe('2:256');
    expect(result.current.page).toBe(42);
    expect(result.current.mode).toBe('mushaf');
    expect(storage.getString(storageKeys.readerLastVerseKey)).toBe('2:255');
    expect(storage.getString(storageKeys.readerMode)).toBe('reading');

    await act(() => {
      jest.advanceTimersByTime(READING_ANCHOR_WRITE_MS - 1);
    });
    expect(storage.getString(storageKeys.readerLastVerseKey)).toBe('2:255');

    await act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(storage.getString(storageKeys.readerLastVerseKey)).toBe('2:256');
    expect(storage.getString(storageKeys.readerLastPage)).toBe('42');
    expect(storage.getString(storageKeys.readerMode)).toBe('mushaf');

    await act(() => {
      jest.advanceTimersByTime(READING_ANCHOR_WRITE_MS);
    });
    await act(() => {
      result.current.setVisible({ verseKey: '2:257', page: null });
    });
    expect(storage.getString(storageKeys.readerLastVerseKey)).toBe('2:257');
    expect(storage.getString(storageKeys.readerLastPage)).toBeUndefined();
  });

  it('writes the pending position when the reader unmounts inside the window', async () => {
    const { result, unmount } = await renderHook(() => useReadingAnchor());
    jest.useFakeTimers();

    await act(() => {
      result.current.setVisible({ verseKey: '4:1', page: 77 });
    });
    await act(() => {
      result.current.setVisible({ verseKey: '4:2' });
    });
    expect(storage.getString(storageKeys.readerLastVerseKey)).toBe('4:1');

    await unmount();
    expect(storage.getString(storageKeys.readerLastVerseKey)).toBe('4:2');
    expect(storage.getString(storageKeys.readerLastPage)).toBe('77');
  });
});

describe('page and verse', () => {
  let database: DatabaseSync | undefined;
  let executor: SqlExecutor;

  beforeAll(async () => {
    const opened = openNodeSqlite(':memory:');
    database = opened.database;
    executor = opened.executor;
    applyContentMigrations(executor, migrationsDir);
    await importSeedIfNeeded(executor, { path: () => seedPath });
  });

  afterAll(() => {
    database?.close();
  });

  it('round-trips pages 1, 2, 50 and 604', () => {
    const keys = [1, 2, 50, 604].map((page) => {
      const verseKey = firstVerseOfPage(executor, page);
      expect(verseKey).toEqual(expect.any(String));
      if (verseKey === undefined) {
        throw new Error(`Page ${page} has no verse.`);
      }
      expect(pageForVerse(executor, verseKey)).toBe(page);
      return verseKey;
    });

    expect(new Set(keys).size).toBe(4);
    expect(pageForVerse(executor, '0:0')).toBeUndefined();
    expect(firstVerseOfPage(executor, 0)).toBeUndefined();
  });
});
