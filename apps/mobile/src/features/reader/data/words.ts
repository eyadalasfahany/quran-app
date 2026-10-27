import type { SqlExecutor } from '@/core/db/sql-executor';

export type WordCharType = 'word' | 'end';

export type WordRecord = {
  verseId: number;
  position: number;
  charType: WordCharType;
  textUthmani: string;
  textImlaei: string;
};

type WordRow = Omit<WordRecord, 'charType'> & { charType: string };

export function getWords(db: SqlExecutor, verseId: number): WordRecord[] {
  return db
    .all<WordRow>(
      `SELECT
         verse_id AS verseId,
         position,
         char_type AS charType,
         text_uthmani AS textUthmani,
         text_imlaei AS textImlaei
       FROM words
       WHERE verse_id = ?
       ORDER BY position`,
      [verseId],
    )
    .map(asWord);
}

function asWord(row: WordRow): WordRecord {
  if (!isWordCharType(row.charType)) {
    throw new Error(`Unknown char_type for verse ${row.verseId} position ${row.position}.`);
  }

  return { ...row, charType: row.charType };
}

function isWordCharType(value: string): value is WordCharType {
  return value === 'word' || value === 'end';
}
