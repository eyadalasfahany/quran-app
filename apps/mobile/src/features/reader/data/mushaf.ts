import type { SqlExecutor } from '@/core/db/sql-executor';

export type MushafWord = {
  wordId: number;
  verseId: number;
  positionInVerse: number;
  charType: string;
  glyph: string;
  positionInLine: number;
};

export type MushafLine = {
  line: number;
  words: MushafWord[];
};

type MushafWordRow = MushafWord & { line: number };

const PAGE_WORDS = `
  SELECT
    word_id AS wordId,
    verse_id AS verseId,
    position_in_verse AS positionInVerse,
    char_type AS charType,
    glyph,
    line,
    position_in_line AS positionInLine
  FROM word_layouts
  WHERE mushaf_id = ? AND page = ?
  ORDER BY line, position_in_line
`;

export function getMushafPage(db: SqlExecutor, mushafId: number, page: number): MushafLine[] {
  const rows = db.all<MushafWordRow>(PAGE_WORDS, [mushafId, page]);
  const lines: MushafLine[] = [];

  for (const row of rows) {
    const current = lines[lines.length - 1];
    const word = asWord(row);
    if (current === undefined || current.line !== row.line) {
      lines.push({ line: row.line, words: [word] });
      continue;
    }
    current.words.push(word);
  }

  return lines;
}

export function isPageInstalled(db: SqlExecutor, mushafId: number, page: number): boolean {
  const row = db.get<{ found: number }>(
    'SELECT 1 AS found FROM mushaf_pages WHERE mushaf_id = ? AND page_number = ? LIMIT 1',
    [mushafId, page],
  );
  return row !== undefined;
}

function asWord(row: MushafWordRow): MushafWord {
  return {
    wordId: row.wordId,
    verseId: row.verseId,
    positionInVerse: row.positionInVerse,
    charType: row.charType,
    glyph: row.glyph,
    positionInLine: row.positionInLine,
  };
}
