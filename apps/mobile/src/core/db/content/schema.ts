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

// Azkar (ADR 0031 §9). Canonical content, delivered as the `azkar` pack group. Column order and keys match
// the API's canonical tables and the pack. Allowed values are enforced by the TS enums below, not by SQL checks.
export const azkarEntryTypes = ['invocation', 'instruction', 'narration'] as const;
export const azkarItemKinds = ['recitation', 'instruction', 'narration'] as const;
export const azkarSegmentKinds = ['text', 'quran'] as const;
export const azkarReviewStatuses = ['sourced', 'reviewed'] as const;
export const azkarTimingTypes = ['time_period', 'prayer_based', 'event_based', 'anytime'] as const;
export const azkarTimingPrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
export const azkarCategoryKinds = ['session', 'browse'] as const;
export const azkarProgressPeriods = ['daily', 'nightly', 'per_prayer', 'session'] as const;
export const azkarNoteKinds = ['explanation', 'context', 'virtue', 'reference', 'grade'] as const;
export const azkarOccasions = [
  'morning',
  'evening',
  'after_prayer',
  'before_sleep',
  'after_waking',
  'entering_home',
  'leaving_home',
  'entering_mosque',
  'leaving_mosque',
  'travel',
  'general',
] as const;

export const azkarChapters = sqliteTable(
  'azkar_chapters',
  {
    resourceId: integer('resource_id').notNull(),
    id: integer('id').notNull(),
    sourceChapterId: text('source_chapter_id').notNull(),
    number: integer('number').notNull(),
    titleAr: text('title_ar'),
    titleEn: text('title_en'),
  },
  (table) => [primaryKey({ columns: [table.resourceId, table.id] })],
);

export const azkarEntries = sqliteTable(
  'azkar_entries',
  {
    resourceId: integer('resource_id').notNull(),
    id: integer('id').notNull(),
    entryKey: text('entry_key').notNull().unique(),
    chapterId: integer('chapter_id').notNull(),
    position: integer('position').notNull(),
    sourceReference: text('source_reference').notNull(),
    entryType: text('entry_type', { enum: azkarEntryTypes }).notNull(),
    occasion: text('occasion', { enum: azkarOccasions }),
    timingType: text('timing_type', { enum: azkarTimingTypes }),
    timingPrayer: text('timing_prayer', { enum: azkarTimingPrayers }),
    timingPolicyId: text('timing_policy_id'),
    reviewStatus: text('review_status', { enum: azkarReviewStatuses }).notNull(),
    sourceVersion: text('source_version').notNull(),
    importedAt: integer('imported_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.resourceId, table.id] }),
    index('azkar_entries_resource_chapter_position_idx').on(table.resourceId, table.chapterId, table.position),
  ],
);

export const azkarItems = sqliteTable(
  'azkar_items',
  {
    resourceId: integer('resource_id').notNull(),
    id: integer('id').notNull(),
    entryId: integer('entry_id').notNull(),
    itemKey: text('item_key').notNull().unique(),
    variationKey: text('variation_key').notNull(),
    position: integer('position').notNull(),
    kind: text('kind', { enum: azkarItemKinds }).notNull(),
    requiredCount: integer('required_count'),
    speaker: text('speaker'),
    sourceDuaId: text('source_dua_id'),
    textEn: text('text_en'),
    transliteration: text('transliteration'),
    sourceTextSha256: text('source_text_sha256'),
    // A run of steps the source says to repeat as a group (OpenDua `repeat` step); null outside one (phase-6 step 3).
    repeatGroup: integer('repeat_group'),
    repeatTimes: integer('repeat_times'),
  },
  (table) => [
    primaryKey({ columns: [table.resourceId, table.id] }),
    index('azkar_items_resource_entry_variation_position_idx').on(
      table.resourceId,
      table.entryId,
      table.variationKey,
      table.position,
    ),
  ],
);

export const azkarSegments = sqliteTable(
  'azkar_segments',
  {
    resourceId: integer('resource_id').notNull(),
    itemId: integer('item_id').notNull(),
    position: integer('position').notNull(),
    kind: text('kind', { enum: azkarSegmentKinds }).notNull(),
    textAr: text('text_ar'),
    quranSurah: integer('quran_surah'),
    quranVerseFrom: integer('quran_verse_from'),
    quranVerseTo: integer('quran_verse_to'),
    textSearch: text('text_search'),
  },
  (table) => [primaryKey({ columns: [table.resourceId, table.itemId, table.position] })],
);

export const azkarCategories = sqliteTable(
  'azkar_categories',
  {
    resourceId: integer('resource_id').notNull(),
    id: text('id').notNull(),
    kind: text('kind', { enum: azkarCategoryKinds }).notNull(),
    position: integer('position').notNull(),
    occasion: text('occasion', { enum: azkarOccasions }),
    progressPeriod: text('progress_period', { enum: azkarProgressPeriods }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.resourceId, table.id] })],
);

export const azkarEntryCategories = sqliteTable(
  'azkar_entry_categories',
  {
    resourceId: integer('resource_id').notNull(),
    categoryId: text('category_id').notNull(),
    entryId: integer('entry_id').notNull(),
    variationKey: text('variation_key').notNull(),
    position: integer('position').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.resourceId, table.categoryId, table.entryId, table.variationKey] }),
  ],
);

export const azkarNotes = sqliteTable(
  'azkar_notes',
  {
    resourceId: integer('resource_id').notNull(),
    id: integer('id').notNull(),
    entryId: integer('entry_id').notNull(),
    itemId: integer('item_id'),
    kind: text('kind', { enum: azkarNoteKinds }).notNull(),
    textAr: text('text_ar'),
    textEn: text('text_en'),
    grader: text('grader'),
    sourceType: text('source_type').notNull(),
    sourceName: text('source_name').notNull(),
    sourceReference: text('source_reference'),
    sourceUrl: text('source_url'),
    reviewStatus: text('review_status', { enum: azkarReviewStatuses }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.resourceId, table.id] }),
    index('azkar_notes_resource_entry_idx').on(table.resourceId, table.entryId),
  ],
);

export const azkarRecordings = sqliteTable(
  'azkar_recordings',
  {
    resourceId: integer('resource_id').notNull(),
    id: integer('id').notNull(),
    recordingKey: text('recording_key').notNull().unique(),
    itemId: integer('item_id').notNull(),
    reciterName: text('reciter_name').notNull(),
    reciterNameAr: text('reciter_name_ar'),
    source: text('source').notNull(),
    remoteUrl: text('remote_url').notNull(),
    durationMs: integer('duration_ms').notNull(),
    sizeBytes: integer('size_bytes'),
    streamAllowed: integer('stream_allowed').notNull(),
    downloadAllowed: integer('download_allowed').notNull(),
    redistributionAllowed: integer('redistribution_allowed').notNull(),
    attributionAr: text('attribution_ar'),
    attributionEn: text('attribution_en'),
    licence: text('licence').notNull(),
    licenceUrl: text('licence_url'),
    rightsVerifiedAt: integer('rights_verified_at'),
  },
  (table) => [
    primaryKey({ columns: [table.resourceId, table.id] }),
    index('azkar_recordings_resource_item_idx').on(table.resourceId, table.itemId),
  ],
);
