import type { SqlExecutor } from '@/core/db/sql-executor';
import { saveNote, setHighlight, toggleBookmark } from '@/features/library/data';

import { openReaderTestContent } from '../../../../jest/reader-test-db';
import { openUserTestStore } from '../../../../jest/user-test-db';
import { getVerseByKey } from '../data/verses';
import {
  loadAyahPanelData,
  loadAyahTranslations,
  loadTafsirOptions,
  loadTafsirPassage,
  loadWordMeanings,
  readAyahUserState,
} from './panel-data';

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
    install(db, 20, 'translations');
    install(db, 97, 'translations');
    // Al-Baqarah 2:3–5 is one passage (verse ids 10–12); 2:1 stands alone.
    db.run(
      `INSERT INTO tafsir_entries (resource_id, group_tafsir_id, first_verse_id, last_verse_id, html)
       VALUES (16, 1, 8, 8, '<p>الم</p>'), (16, 2, 10, 12, '<p>الذين يؤمنون بالغيب</p>')`,
    );
    db.run(
      `INSERT INTO translation_entries (resource_id, verse_id, text, footnotes)
       VALUES (20, 2, 'All praise is due to Allah', NULL), (97, 2, 'سب تعریفیں اللہ کے لیے ہیں', NULL)`,
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

  it('lists installed tafsirs', () => {
    expect(loadTafsirOptions(db, (id) => `Tafsir ${id}`)).toEqual([{ authorName: null, name: 'Tafsir 16', resourceId: 16 }]);
  });

  it('returns the selected installed translations in the reader order with their direction', () => {
    const translations = loadAyahTranslations(db, 2, [97, 20, 55], (id) => `T${id}`);

    expect(translations.map((item) => [item.meta.resourceId, item.meta.direction, item.text])).toEqual([
      [97, 'rtl', 'سب تعریفیں اللہ کے لیے ہیں'],
      [20, 'ltr', 'All praise is due to Allah'],
    ]);
  });

  it('pairs Uthmani words with meanings only when every word has one', () => {
    const words = loadWordMeanings(db, 1, new Map([[1, 'In the name'], [2, 'of Allah'], [3, 'the Most Gracious'], [4, 'the Most Merciful']]));

    expect(loadWordMeanings(db, 1, null)).toEqual([]);
    expect(loadWordMeanings(db, 1, new Map([[1, 'In the name']]))).toEqual([]);
    expect(words.map((word) => word.meaning)).toEqual(['In the name', 'of Allah', 'the Most Gracious', 'the Most Merciful']);
    expect(words[0]?.word).toBe(getVerseByKey(db, '1:1')?.textUthmani.split(' ')[0]);
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
