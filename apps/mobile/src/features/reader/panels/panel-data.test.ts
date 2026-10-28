import type { SqlExecutor } from '@/core/db/sql-executor';
import { saveNote, setHighlight, toggleBookmark } from '@/features/library/data';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { openUserTestStore } from '../../../../jest/user-test-db';
import { getVerseByKey } from '../data/verses';
import { loadAyahPanelData, loadTafsirOptions, loadTafsirPassage, readAyahUserState } from './panel-data';

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
      { authorName: null, direction: null, name: null, nameAr: null, resourceId: 16 },
    ]);

    db.run(
      'UPDATE installed_resources SET name = ?, name_ar = ?, author_name = ?, direction = ? WHERE resource_id = ?',
      ['Al-Muyassar', 'التفسير الميسر', 'نخبة من العلماء', 'rtl', 16],
    );
    expect(loadTafsirOptions(db)).toEqual([
      { authorName: 'نخبة من العلماء', direction: 'rtl', name: 'Al-Muyassar', nameAr: 'التفسير الميسر', resourceId: 16 },
    ]);
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
