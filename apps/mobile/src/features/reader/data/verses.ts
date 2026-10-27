import type { SqlExecutor } from '@/core/db/sql-executor';

export type Sajdah = 'none' | 'recommended' | 'obligatory';

export type VerseRecord = {
  id: number;
  verseKey: string;
  chapterId: number;
  verseNumber: number;
  juz: number;
  hizb: number;
  rubElHizb: number;
  page: number;
  sajdah: Sajdah;
  textUthmani: string;
  textUthmaniTajweed: string | null;
  textIndopak: string | null;
  textImlaei: string | null;
  textSearch: string;
};

type VerseRow = Omit<VerseRecord, 'sajdah'> & { sajdah: string };

const VERSE_SELECT = `
  SELECT
    id,
    verse_key AS verseKey,
    chapter_id AS chapterId,
    verse_number AS verseNumber,
    juz,
    hizb,
    rub_el_hizb AS rubElHizb,
    page,
    sajdah,
    text_uthmani AS textUthmani,
    text_uthmani_tajweed AS textUthmaniTajweed,
    text_indopak AS textIndopak,
    text_imlaei AS textImlaei,
    text_search AS textSearch
  FROM verses
`;

export function getVersesBySurah(db: SqlExecutor, chapterId: number): VerseRecord[] {
  return db
    .all<VerseRow>(`${VERSE_SELECT} WHERE chapter_id = ? ORDER BY verse_number, id`, [chapterId])
    .map(asVerse);
}

export function getVersesByPage(db: SqlExecutor, page: number): VerseRecord[] {
  return db.all<VerseRow>(`${VERSE_SELECT} WHERE page = ? ORDER BY id`, [page]).map(asVerse);
}

export function getVerseRange(db: SqlExecutor, fromId: number, toId: number): VerseRecord[] {
  return db
    .all<VerseRow>(`${VERSE_SELECT} WHERE id >= ? AND id <= ? ORDER BY id`, [fromId, toId])
    .map(asVerse);
}

export function getVerseByKey(db: SqlExecutor, key: string): VerseRecord | undefined {
  const row = db.get<VerseRow>(`${VERSE_SELECT} WHERE verse_key = ?`, [key]);
  return row === undefined ? undefined : asVerse(row);
}

export function verseKeyToId(db: SqlExecutor, key: string): number | undefined {
  return db.get<{ id: number }>('SELECT id FROM verses WHERE verse_key = ?', [key])?.id;
}

export function idToVerseKey(db: SqlExecutor, id: number): string | undefined {
  return db.get<{ verseKey: string }>('SELECT verse_key AS verseKey FROM verses WHERE id = ?', [id])?.verseKey;
}

function asVerse(row: VerseRow): VerseRecord {
  if (!isSajdah(row.sajdah)) {
    throw new Error(`Unknown sajdah value for verse ${row.verseKey}.`);
  }

  return { ...row, sajdah: row.sajdah };
}

function isSajdah(value: string): value is Sajdah {
  return value === 'none' || value === 'recommended' || value === 'obligatory';
}
