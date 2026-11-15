import type { DatabaseSync } from 'node:sqlite';

import type { SqlExecutor } from '@/core/db/sql-executor';

import { openAzkarContentDb } from '../../../../jest/azkar-test-db';
import { getQuranSegmentTexts } from './content-repository';
import type { AzkarSegment } from './model';
import { resolveQuranVerses } from './quran-segments';

/*
| ADR 0093: a partial-verse segment renders only its quoted words, read from `words` by position, and joins them with one
| space. The Quran here is placeholder text («تجريبي» = test word, not Quran); verse 2:1 holds three words, 2:2 two, 2:3
| one. Each verse's words joined with one space equal its stored text, as the seed asserts, so a partial result must be an
| exact slice of that text.
*/

const VERSES: { id: number; key: string; chapter: number; ayah: number; words: string[] }[] = [
  { id: 1001, key: '2:1', chapter: 2, ayah: 1, words: ['تجريبي١', 'تجريبي٢', 'تجريبي٣'] },
  { id: 1002, key: '2:2', chapter: 2, ayah: 2, words: ['تجريبي٤', 'تجريبي٥'] },
  { id: 1003, key: '2:3', chapter: 2, ayah: 3, words: ['تجريبي٦'] },
];

function verseText(key: string): string {
  return (VERSES.find((verse) => verse.key === key)?.words ?? []).join(' ');
}

function insertPlaceholderQuran(database: DatabaseSync): void {
  const insertVerse = database.prepare(
    `INSERT INTO verses (id, verse_key, chapter_id, verse_number, juz, hizb, rub_el_hizb, page, sajdah, text_uthmani, text_search)
     VALUES (?, ?, ?, ?, 1, 1, 1, 1, 'none', ?, ?)`,
  );
  const insertWord = database.prepare(
    'INSERT INTO words (verse_id, position, char_type, text_uthmani, text_imlaei) VALUES (?, ?, ?, ?, ?)',
  );

  for (const verse of VERSES) {
    insertVerse.run(verse.id, verse.key, verse.chapter, verse.ayah, verseText(verse.key), verseText(verse.key));
    verse.words.forEach((word, index) => insertWord.run(verse.id, index + 1, 'word', word, word));
    insertWord.run(verse.id, verse.words.length + 1, 'end', '', '');
  }
}

function quranSegment(
  quranVerseFrom: number,
  quranVerseTo: number | null,
  wordFrom: number | null,
  wordTo: number | null,
): Pick<AzkarSegment, 'kind' | 'quranSurah' | 'quranVerseFrom' | 'quranVerseTo' | 'wordFrom' | 'wordTo'> {
  return { kind: 'quran', quranSurah: 2, quranVerseFrom, quranVerseTo, wordFrom, wordTo };
}

describe('getQuranSegmentTexts', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openAzkarContentDb();
    database = opened.database;
    executor = opened.executor;
    insertPlaceholderQuran(database);
  });

  afterEach(() => {
    database.close();
  });

  it('a whole-verse segment gives each verse exactly as stored', () => {
    expect(getQuranSegmentTexts(executor, quranSegment(1, null, null, null))).toEqual([verseText('2:1')]);
    expect(getQuranSegmentTexts(executor, quranSegment(1, 2, null, null))).toEqual([verseText('2:1'), verseText('2:2')]);
  });

  it('a partial range in one verse gives only its words, an exact slice of the stored verse', () => {
    const texts = getQuranSegmentTexts(executor, quranSegment(1, null, 2, null));

    expect(texts).toEqual(['تجريبي٢ تجريبي٣']);
    expect(verseText('2:1').includes(texts[0] ?? '')).toBe(true);
  });

  it('a partial range with both ends in one verse keeps the words between them', () => {
    expect(getQuranSegmentTexts(executor, quranSegment(1, null, 1, 2))).toEqual(['تجريبي١ تجريبي٢']);
  });

  it('a partial range across two verses: the first from its word, the last to its word', () => {
    expect(getQuranSegmentTexts(executor, quranSegment(1, 2, 3, 1))).toEqual(['تجريبي٣', 'تجريبي٤']);
  });

  it('a partial range across three verses keeps the middle verse whole', () => {
    expect(getQuranSegmentTexts(executor, quranSegment(1, 3, 2, 1))).toEqual([
      'تجريبي٢ تجريبي٣',
      verseText('2:2'),
      'تجريبي٦',
    ]);
  });

  it('only word_to: the verse from its start to that word', () => {
    expect(getQuranSegmentTexts(executor, quranSegment(2, null, null, 1))).toEqual(['تجريبي٤']);
  });

  it('never falls back to the whole verse when a word is missing', () => {
    database.prepare('DELETE FROM words WHERE verse_id = ? AND position = ?').run(1002, 2);

    expect(getQuranSegmentTexts(executor, quranSegment(2, null, null, 2))).toEqual([]);
    expect(getQuranSegmentTexts(executor, quranSegment(2, null, 1, null))).toEqual([]);
  });

  it('returns nothing for a position beyond the verse, a reversed range, or a verse that is not stored', () => {
    expect(getQuranSegmentTexts(executor, quranSegment(1, null, null, 9))).toEqual([]);
    expect(getQuranSegmentTexts(executor, quranSegment(1, null, 3, 1))).toEqual([]);
    expect(getQuranSegmentTexts(executor, quranSegment(50, null, 1, null))).toEqual([]);
  });

  it('returns nothing for a segment that is not a quran segment', () => {
    expect(getQuranSegmentTexts(executor, { ...quranSegment(1, null, 2, null), kind: 'text' })).toEqual([]);
  });

  it('resolveQuranVerses gives the same words to the reader, the player and the share text', () => {
    const segment = { ...quranSegment(1, null, 2, null), resourceId: -1, itemId: 7, position: 1, textAr: null, textSearch: null, wordFrom: 2, wordTo: null };

    const resolved = resolveQuranVerses(executor, [{ segments: [segment] }]);

    expect(resolved.get('7:1')).toEqual(['تجريبي٢ تجريبي٣']);
  });
});
