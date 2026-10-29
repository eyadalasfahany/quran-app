import type { SqlExecutor } from '@/core/db/sql-executor';
import { saveNote, setHighlight, toggleBookmark } from '@/features/library/data';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { openUserTestStore } from '../../../../jest/user-test-db';
import { getVerseByKey } from '../data/verses';
import { loadAyahPanelData, loadCatalogTafsirOptions, loadTafsirOptions, loadTafsirPassage, readAyahUserState } from './panel-data';

jest.mock('expo-crypto', () => ({ randomUUID: () => globalThis.crypto.randomUUID() }));

function install(db: SqlExecutor, resourceId: number, group: string): void {
  db.run(
    `INSERT INTO installed_resources (resource_id, "group", version, sha256, last_checked_at, change_cursor)
     VALUES (?, ?, 1, 'sha', 0, NULL)`,
    [resourceId, group],
  );
}

describe('panel data', () => {
  let db: SqlExecutor;

  beforeAll(async () => {
    db = (await openReaderTestContent()).executor;
    install(db, 16, 'tafsirs');
    // Al-Baqarah 2:3–5 is one passage (verse ids 10–12); 2:1 stands alone.
    db.run(
      `INSERT INTO tafsir_entries (resource_id, group_tafsir_id, first_verse_id, last_verse_id, html)
       VALUES (16, 1, 8, 8, '<p>الم</p>'), (16, 2, 10, 12, '<p>الذين يؤمنون بالغيب</p>')`,
    );
  });

  it('loads the verse, its surah and its neighbours', () => {
    const data = loadAyahPanelData(db, '1:1');

    expect(data?.chapter?.nameArabic).toBe('الفاتحة');
    expect(data?.previousKey).toBeUndefined();
    expect(data?.nextKey).toBe('1:2');
    expect(loadAyahPanelData(db, '1:7')?.nextKey).toBe('2:1');
    expect(loadAyahPanelData(db, '999:1')).toBeNull();
  });

  it('reports the range a tafsir passage covers', () => {
    const verse = getVerseByKey(db, '2:4');
    const single = getVerseByKey(db, '2:1');
    if (verse === undefined || single === undefined) {
      throw new Error('seed is missing Al-Baqarah');
    }

    expect(loadTafsirPassage(db, 16, verse)).toEqual({ coverage: { from: 3, to: 5 }, html: '<p>الذين يؤمنون بالغيب</p>' });
    expect(loadTafsirPassage(db, 16, single)).toEqual({ coverage: null, html: '<p>الم</p>' });
    expect(loadTafsirPassage(db, 99, verse)).toBeNull();
  });

  it('lists installed tafsirs with their names, author and direction', () => {
    expect(loadTafsirOptions(db)).toEqual([
      { authorAr: null, authorName: null, direction: null, name: null, nameAr: null, resourceId: 16 },
    ]);

    db.run(
      'UPDATE installed_resources SET name = ?, name_ar = ?, author_name = ?, author_ar = ?, direction = ? WHERE resource_id = ?',
      ['Al-Muyassar', 'التفسير الميسر', 'نخبة من العلماء', 'مجموعة من العلماء', 'rtl', 16],
    );
    expect(loadTafsirOptions(db)).toEqual([
      {
        authorAr: 'مجموعة من العلماء',
        authorName: 'نخبة من العلماء',
        direction: 'rtl',
        name: 'Al-Muyassar',
        nameAr: 'التفسير الميسر',
        resourceId: 16,
      },
    ]);
  });

  it('lists the catalogue with install state and pack size, sorted by resource id', async () => {
    const fresh = (await openReaderTestContent()).executor;
    install(fresh, 14, 'tafsirs');
    fresh.run(
      `INSERT INTO catalog_resources (resource_id, "group", name, name_ar, author_name, author_ar, language_code, direction, version, pack_size_bytes)
       VALUES (926, 'tafsirs', 'Al-Jalalayn', 'تفسير الجلالين', NULL, 'جلال الدين المحلي', 'ar', 'rtl', 1, 900000),
              (14, 'tafsirs', 'Ibn Kathir', 'ابن كثير', 'Hafiz Ibn Kathir', 'ابن كثير', 'ar', 'rtl', 1, 4800000),
              (90, 'tafsirs', 'Al-Muyassar', 'التفسير الميسر', NULL, NULL, 'ar', 'rtl', 1, 1200000)`,
    );

    expect(loadCatalogTafsirOptions(fresh)).toEqual([
      {
        authorAr: 'ابن كثير',
        authorName: 'Hafiz Ibn Kathir',
        direction: 'rtl',
        installed: true,
        name: 'Ibn Kathir',
        nameAr: 'ابن كثير',
        packSizeBytes: 4800000,
        resourceId: 14,
      },
      {
        authorAr: null,
        authorName: null,
        direction: 'rtl',
        installed: false,
        name: 'Al-Muyassar',
        nameAr: 'التفسير الميسر',
        packSizeBytes: 1200000,
        resourceId: 90,
      },
      {
        authorAr: 'جلال الدين المحلي',
        authorName: null,
        direction: 'rtl',
        installed: false,
        name: 'Al-Jalalayn',
        nameAr: 'تفسير الجلالين',
        packSizeBytes: 900000,
        resourceId: 926,
      },
    ]);
  });

  it('adds installed tafsirs the catalogue does not list, with no pack size', async () => {
    const fresh = (await openReaderTestContent()).executor;
    install(fresh, 16, 'tafsirs');

    expect(loadCatalogTafsirOptions(fresh)).toEqual([
      { authorAr: null, authorName: null, direction: null, installed: true, name: null, nameAr: null, packSizeBytes: 0, resourceId: 16 },
    ]);
  });

  it('is empty with no catalogue and nothing installed', async () => {
    expect(loadCatalogTafsirOptions((await openReaderTestContent()).executor)).toEqual([]);
  });

  it('reads the ayah bookmark, highlight and latest note from user.db', () => {
    const { store } = openUserTestStore();
    toggleBookmark(2, store);
    setHighlight(2, 'rose', store);
    saveNote(2, 'note', store);

    expect(readAyahUserState(2, store)).toMatchObject({ bookmarked: true, highlight: 'rose', note: { body: 'note' } });
    expect(readAyahUserState(3, store)).toEqual({ bookmarked: false, highlight: null, note: null });
  });

  it('falls back to empty state when user.db cannot open', () => {
    expect(readAyahUserState(2)).toEqual({ bookmarked: false, highlight: null, note: null });
  });
});
