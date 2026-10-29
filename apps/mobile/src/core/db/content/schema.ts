import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const chapters = sqliteTable('chapters', {
  id: integer('id').primaryKey(),
  nameArabic: text('name_arabic').notNull(),
  nameSimple: text('name_simple').notNull(),
  nameEn: text('name_en').notNull(),
  revelationPlace: text('revelation_place', { enum: ['makkah', 'madinah'] }).notNull(),
  revelationOrder: integer('revelation_order').notNull(),
  versesCount: integer('verses_count').notNull(),
  bismillahPre: integer('bismillah_pre').notNull(),
  bismillahText: text('bismillah_text'),
  bismillahImlaei: text('bismillah_imlaei'),
  pageStart: integer('page_start').notNull(),
  pageEnd: integer('page_end').notNull(),
});

export const words = sqliteTable(
  'words',
  {
    verseId: integer('verse_id').notNull(),
    position: integer('position').notNull(),
    charType: text('char_type', { enum: ['word', 'end'] }).notNull(),
    textUthmani: text('text_uthmani').notNull(),
    textImlaei: text('text_imlaei').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.verseId, table.position] }),
    index('words_verse_id_idx').on(table.verseId),
  ],
);

export const verses = sqliteTable(
  'verses',
  {
    id: integer('id').primaryKey(),
    verseKey: text('verse_key').notNull().unique(),
    chapterId: integer('chapter_id').notNull(),
    verseNumber: integer('verse_number').notNull(),
    juz: integer('juz').notNull(),
    hizb: integer('hizb').notNull(),
    rubElHizb: integer('rub_el_hizb').notNull(),
    page: integer('page').notNull(),
    sajdah: text('sajdah', { enum: ['none', 'recommended', 'obligatory'] }).notNull(),
    textUthmani: text('text_uthmani').notNull(),
    textUthmaniTajweed: text('text_uthmani_tajweed'),
    textIndopak: text('text_indopak'),
    textImlaei: text('text_imlaei'),
    textSearch: text('text_search').notNull(),
  },
  (table) => [
    index('verses_page_idx').on(table.page),
    index('verses_chapter_verse_idx').on(table.chapterId, table.verseNumber),
  ],
);

export const installedResources = sqliteTable('installed_resources', {
  resourceId: integer('resource_id').primaryKey(),
  group: text('group').notNull(),
  version: integer('version').notNull(),
  sha256: text('sha256').notNull(),
  lastCheckedAt: integer('last_checked_at').notNull(),
  changeCursor: text('change_cursor'),
  name: text('name'),
  nameAr: text('name_ar'),
  authorName: text('author_name'),
  languageCode: text('language_code'),
  direction: text('direction', { enum: ['rtl', 'ltr'] }),
  authorAr: text('author_ar'),
});

export const catalogResources = sqliteTable('catalog_resources', {
  resourceId: integer('resource_id').primaryKey(),
  group: text('group').notNull(),
  name: text('name'),
  nameAr: text('name_ar'),
  authorName: text('author_name'),
  languageCode: text('language_code'),
  direction: text('direction', { enum: ['rtl', 'ltr'] }),
  version: integer('version').notNull(),
  packSizeBytes: integer('pack_size_bytes').notNull(),
  authorAr: text('author_ar'),
  isDefault: integer('is_default').notNull().default(0),
  style: text('style'),
});

export const tafsirEntries = sqliteTable(
  'tafsir_entries',
  {
    resourceId: integer('resource_id').notNull(),
    groupTafsirId: integer('group_tafsir_id').notNull(),
    firstVerseId: integer('first_verse_id').notNull(),
    lastVerseId: integer('last_verse_id').notNull(),
    html: text('html').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.resourceId, table.groupTafsirId] }),
    index('tafsir_entries_resource_first_verse_idx').on(table.resourceId, table.firstVerseId),
  ],
);

export const mushafs = sqliteTable('mushafs', {
  id: integer('id').primaryKey(),
  resourceId: integer('resource_id').notNull(),
  name: text('name').notNull(),
  pagesCount: integer('pages_count').notNull(),
  linesPerPage: integer('lines_per_page').notNull(),
  defaultFontName: text('default_font_name'),
});

export const mushafPages = sqliteTable(
  'mushaf_pages',
  {
    mushafId: integer('mushaf_id').notNull(),
    pageNumber: integer('page_number').notNull(),
    firstVerseId: integer('first_verse_id').notNull(),
    lastVerseId: integer('last_verse_id').notNull(),
    firstWordId: integer('first_word_id').notNull(),
    lastWordId: integer('last_word_id').notNull(),
    verseMapping: text('verse_mapping').notNull(),
  },
  (table) => [primaryKey({ columns: [table.mushafId, table.pageNumber] })],
);

export const wordLayouts = sqliteTable(
  'word_layouts',
  {
    mushafId: integer('mushaf_id').notNull(),
    wordId: integer('word_id').notNull(),
    verseId: integer('verse_id').notNull(),
    positionInVerse: integer('position_in_verse').notNull(),
    charType: text('char_type').notNull(),
    glyph: text('glyph').notNull(),
    page: integer('page').notNull(),
    line: integer('line').notNull(),
    positionInLine: integer('position_in_line').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.mushafId, table.wordId] }),
    index('word_layouts_mushaf_page_line_idx').on(table.mushafId, table.page, table.line),
  ],
);

export const recitations = sqliteTable('recitations', {
  id: integer('id').primaryKey(),
  resourceId: integer('resource_id').notNull(),
  reciterName: text('reciter_name'),
  reciterNameAr: text('reciter_name_ar'),
  style: text('style'),
  qirat: text('qirat'),
  hasWordSegments: integer('has_word_segments').notNull(),
});

export const chapterAudioFiles = sqliteTable('chapter_audio_files', {
  id: integer('id').primaryKey(),
  recitationId: integer('recitation_id').notNull(),
  chapterId: integer('chapter_id').notNull(),
  audioUrl: text('audio_url').notNull(),
  sizeBytes: integer('size_bytes'),
  durationMs: integer('duration_ms').notNull(),
  format: text('format').notNull(),
});

export const recitationTimings = sqliteTable(
  'recitation_timings',
  {
    audioFileId: integer('audio_file_id').notNull(),
    verseId: integer('verse_id').notNull(),
    startMs: integer('start_ms').notNull(),
    endMs: integer('end_ms').notNull(),
    segments: text('segments'),
  },
  (table) => [primaryKey({ columns: [table.audioFileId, table.verseId] })],
);
