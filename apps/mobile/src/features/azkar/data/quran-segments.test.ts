import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { getEntry } from './content-repository';
import { loadAzkarDevFixtures } from './__fixtures__/dev-fixtures';
import { quranSegmentKey, resolveQuranVerses } from './quran-segments';

// Verse rows are placeholders: the real Quran text comes from the Tanzil seed, never from these tests.
function insertPlaceholderVerses(database: DatabaseSync): void {
  const insert = database.prepare(
    `INSERT INTO verses (id, verse_key, chapter_id, verse_number, juz, hizb, rub_el_hizb, page, sajdah, text_uthmani, text_search)
     VALUES (?, ?, 1, ?, 1, 1, 1, 1, 'none', ?, ?)`,
  );
  insert.run(1, '1:1', 1, 'FIXTURE VERSE 1:1', 'fixture verse 1 1');
}

describe('resolveQuranVerses', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    insertPlaceholderVerses(database);
    loadAzkarDevFixtures(executor);
  });

  afterEach(() => {
    database.close();
  });

  it('resolves each quran segment of the items once, keyed by segment, and skips text segments', () => {
    const items = getEntry(executor, 'fixture:entry-002')?.items ?? [];

    const resolved = resolveQuranVerses(executor, items);

    const quran = items.flatMap((item) => item.segments).filter((segment) => segment.kind === 'quran');
    expect(quran.length).toBeGreaterThan(0);
    for (const segment of quran) {
      expect(resolved.get(quranSegmentKey(segment))).toEqual(['FIXTURE VERSE 1:1']);
    }
    expect(resolved.size).toBe(quran.length);
  });

  it('maps a quran segment that does not resolve to an empty list, never a fabricated text', () => {
    const missing = { itemId: 99, position: 1, kind: 'quran' as const, quranSurah: 114, quranVerseFrom: 6, quranVerseTo: null };

    const resolved = resolveQuranVerses(executor, [{ segments: [{ ...missing, resourceId: -1, textAr: null, quranVerseTo: null, textSearch: null }] }]);

    expect(resolved.get(quranSegmentKey(missing))).toEqual([]);
  });

  it('keys by item and position, so two items never share a verse', () => {
    expect(quranSegmentKey({ itemId: 1, position: 2 })).not.toBe(quranSegmentKey({ itemId: 2, position: 2 }));
  });
});
