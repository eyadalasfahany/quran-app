export const META_COLUMNS = ['key', 'value'] as const;

export const CHAPTER_COLUMNS = [
  'id',
  'name_arabic',
  'name_simple',
  'name_en',
  'revelation_place',
  'revelation_order',
  'verses_count',
  'bismillah_pre',
  'bismillah_text',
  'bismillah_imlaei',
  'page_start',
  'page_end',
] as const;

export const WORD_COLUMNS = [
  'verse_id',
  'position',
  'char_type',
  'text_uthmani',
  'text_imlaei',
] as const;

export const VERSE_COLUMNS = [
  'id',
  'verse_key',
  'chapter_id',
  'verse_number',
  'juz',
  'hizb',
  'rub_el_hizb',
  'page',
  'sajdah',
  'text_uthmani',
  'text_uthmani_tajweed',
  'text_indopak',
  'text_imlaei',
  'text_search',
] as const;

export const SEED_TABLES = ['meta', 'chapters', 'verses', 'words'] as const;

// The seed is a copy source, not content.db: no migration table and no pack tables.
export const SEED_SCHEMA_SQL = `
CREATE TABLE meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE chapters (
  id INTEGER PRIMARY KEY,
  name_arabic TEXT NOT NULL,
  name_simple TEXT NOT NULL,
  name_en TEXT NOT NULL,
  revelation_place TEXT NOT NULL,
  revelation_order INTEGER NOT NULL,
  verses_count INTEGER NOT NULL,
  bismillah_pre INTEGER NOT NULL,
  bismillah_text TEXT,
  bismillah_imlaei TEXT,
  page_start INTEGER NOT NULL,
  page_end INTEGER NOT NULL
);

CREATE TABLE verses (
  id INTEGER PRIMARY KEY,
  verse_key TEXT NOT NULL UNIQUE,
  chapter_id INTEGER NOT NULL,
  verse_number INTEGER NOT NULL,
  juz INTEGER NOT NULL,
  hizb INTEGER NOT NULL,
  rub_el_hizb INTEGER NOT NULL,
  page INTEGER NOT NULL,
  sajdah TEXT NOT NULL,
  text_uthmani TEXT NOT NULL,
  text_uthmani_tajweed TEXT,
  text_indopak TEXT,
  text_imlaei TEXT,
  text_search TEXT NOT NULL
);

CREATE TABLE words (
  verse_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  char_type TEXT NOT NULL,
  text_uthmani TEXT NOT NULL,
  text_imlaei TEXT NOT NULL,
  PRIMARY KEY (verse_id, position)
);

CREATE INDEX words_verse_id_idx ON words (verse_id);
`;

export function insertFromAttached(table: string, columns: readonly string[], schemaName: string): string {
  const list = columns.join(', ');
  return `INSERT INTO ${table} (${list}) SELECT ${list} FROM ${schemaName}.${table}`;
}
