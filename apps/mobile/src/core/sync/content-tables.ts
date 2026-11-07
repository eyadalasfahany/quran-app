export type PackGroup = 'tafsirs' | 'mushafs' | 'chapter_recitations' | 'azkar' | 'duas' | 'names' | 'hadith_collections';

export type ContentColumn = {
  name: string;
  kind: 'integer' | 'text';
  nullable: boolean;
};

export type ContentTable = {
  name: string;
  columns: readonly ContentColumn[];
};

export type ContentEntity = {
  entity: string;
  table: string;
  keyColumns: readonly string[];
  deleteSql: string;
};

export type ContentGroupSchema = {
  group: PackGroup;
  tables: readonly ContentTable[];
  entities: readonly ContentEntity[];
  deleteResourceSql: readonly string[];
  /** Statements run after the tables are copied, in the same transaction, each with `[resource_id]`. */
  afterImportSql?: readonly string[];
};

export type ContentContractGroup = {
  group: PackGroup;
  tables: { name: string; columns: string[] }[];
  entities: { entity: string; key: string }[];
};

const RESOURCE = 'resource_id = ?';

export const CONTENT_GROUPS: readonly ContentGroupSchema[] = [
  {
    group: 'tafsirs',
    tables: [
      table('tafsir_entries', [
        integer('resource_id'),
        integer('group_tafsir_id'),
        integer('first_verse_id'),
        integer('last_verse_id'),
        text('html'),
      ]),
    ],
    entities: [
      entity(
        'tafsir_entry',
        'tafsir_entries',
        ['group_tafsir_id'],
        `DELETE FROM tafsir_entries WHERE group_tafsir_id = ? AND ${RESOURCE}`,
      ),
    ],
    deleteResourceSql: [`DELETE FROM tafsir_entries WHERE ${RESOURCE}`],
  },
  {
    group: 'mushafs',
    tables: [
      table('mushafs', [
        integer('id'),
        integer('resource_id'),
        text('name'),
        integer('pages_count'),
        integer('lines_per_page'),
        text('default_font_name', true),
      ]),
      table('mushaf_pages', [
        integer('mushaf_id'),
        integer('page_number'),
        integer('first_verse_id'),
        integer('last_verse_id'),
        integer('first_word_id'),
        integer('last_word_id'),
        text('verse_mapping'),
      ]),
      table('word_layouts', [
        integer('mushaf_id'),
        integer('word_id'),
        integer('verse_id'),
        integer('position_in_verse'),
        text('char_type'),
        text('glyph'),
        integer('page'),
        integer('line'),
        integer('position_in_line'),
      ]),
    ],
    entities: [
      entity('mushaf', 'mushafs', ['id'], `DELETE FROM mushafs WHERE id = ? AND ${RESOURCE}`),
      entity(
        'mushaf_page',
        'mushaf_pages',
        ['page_number'],
        `DELETE FROM mushaf_pages WHERE page_number = ? AND mushaf_id IN (SELECT id FROM mushafs WHERE ${RESOURCE})`,
      ),
      entity(
        'word_layout',
        'word_layouts',
        ['word_id'],
        `DELETE FROM word_layouts WHERE word_id = ? AND mushaf_id IN (SELECT id FROM mushafs WHERE ${RESOURCE})`,
      ),
    ],
    deleteResourceSql: [
      `DELETE FROM word_layouts WHERE mushaf_id IN (SELECT id FROM mushafs WHERE ${RESOURCE})`,
      `DELETE FROM mushaf_pages WHERE mushaf_id IN (SELECT id FROM mushafs WHERE ${RESOURCE})`,
      `DELETE FROM mushafs WHERE ${RESOURCE}`,
    ],
  },
  {
    group: 'chapter_recitations',
    tables: [
      table('recitations', [
        integer('id'),
        integer('resource_id'),
        text('reciter_name', true),
        text('reciter_name_ar', true),
        text('style', true),
        text('qirat', true),
        integer('has_word_segments'),
      ]),
      table('chapter_audio_files', [
        integer('id'),
        integer('recitation_id'),
        integer('chapter_id'),
        text('audio_url'),
        integer('size_bytes', true),
        integer('duration_ms'),
        text('format'),
      ]),
      table('recitation_timings', [
        integer('audio_file_id'),
        integer('verse_id'),
        integer('start_ms'),
        integer('end_ms'),
        text('segments', true),
      ]),
    ],
    entities: [
      entity('recitation', 'recitations', ['id'], `DELETE FROM recitations WHERE id = ? AND ${RESOURCE}`),
      entity(
        'chapter_audio_file',
        'chapter_audio_files',
        ['id'],
        `DELETE FROM chapter_audio_files WHERE id = ? AND recitation_id IN (SELECT id FROM recitations WHERE ${RESOURCE})`,
      ),
      entity(
        'recitation_timing',
        'recitation_timings',
        ['audio_file_id', 'verse_id'],
        `DELETE FROM recitation_timings WHERE audio_file_id = ? AND verse_id = ? AND audio_file_id IN (SELECT id FROM chapter_audio_files WHERE recitation_id IN (SELECT id FROM recitations WHERE ${RESOURCE}))`,
      ),
    ],
    deleteResourceSql: [
      `DELETE FROM recitation_timings WHERE audio_file_id IN (SELECT id FROM chapter_audio_files WHERE recitation_id IN (SELECT id FROM recitations WHERE ${RESOURCE}))`,
      `DELETE FROM chapter_audio_files WHERE recitation_id IN (SELECT id FROM recitations WHERE ${RESOURCE})`,
      `DELETE FROM recitations WHERE ${RESOURCE}`,
    ],
  },
  {
    group: 'azkar',
    tables: [
      table('azkar_chapters', [
        integer('resource_id'),
        integer('id'),
        text('source_chapter_id'),
        integer('number'),
        text('title_ar', true),
        text('title_en', true),
      ]),
      table('azkar_entries', [
        integer('resource_id'),
        integer('id'),
        text('entry_key'),
        integer('chapter_id'),
        integer('position'),
        text('source_reference'),
        text('entry_type'),
        text('occasion', true),
        text('timing_type', true),
        text('timing_prayer', true),
        text('timing_policy_id', true),
        text('review_status'),
        text('source_version'),
        integer('imported_at'),
      ]),
      table('azkar_items', [
        integer('resource_id'),
        integer('id'),
        integer('entry_id'),
        text('item_key'),
        text('variation_key'),
        integer('position'),
        text('kind'),
        integer('required_count', true),
        text('speaker', true),
        text('source_dua_id', true),
        text('text_en', true),
        text('transliteration', true),
        text('source_text_sha256', true),
        integer('repeat_group', true),
        integer('repeat_times', true),
      ]),
      table('azkar_segments', [
        integer('resource_id'),
        integer('item_id'),
        integer('position'),
        text('kind'),
        text('text_ar', true),
        integer('quran_surah', true),
        integer('quran_verse_from', true),
        integer('quran_verse_to', true),
        text('text_search', true),
      ]),
      table('azkar_categories', [
        integer('resource_id'),
        text('id'),
        text('kind'),
        integer('position'),
        text('occasion', true),
        text('progress_period'),
      ]),
      table('azkar_entry_categories', [
        integer('resource_id'),
        text('category_id'),
        integer('entry_id'),
        text('variation_key'),
        integer('position'),
      ]),
      table('azkar_notes', [
        integer('resource_id'),
        integer('id'),
        integer('entry_id'),
        integer('item_id', true),
        text('kind'),
        text('text_ar', true),
        text('text_en', true),
        text('grader', true),
        text('source_type'),
        text('source_name'),
        text('source_reference', true),
        text('source_url', true),
        text('review_status'),
      ]),
      table('azkar_recordings', [
        integer('resource_id'),
        integer('id'),
        text('recording_key'),
        integer('item_id'),
        text('reciter_name'),
        text('reciter_name_ar', true),
        text('source'),
        text('remote_url'),
        integer('duration_ms'),
        integer('size_bytes', true),
        integer('stream_allowed'),
        integer('download_allowed'),
        integer('redistribution_allowed'),
        text('attribution_ar', true),
        text('attribution_en', true),
        text('licence'),
        text('licence_url', true),
        integer('rights_verified_at', true),
      ]),
    ],
    entities: [
      entity('azkar_chapter', 'azkar_chapters', ['id'], `DELETE FROM azkar_chapters WHERE id = ? AND ${RESOURCE}`),
      entity('azkar_entry', 'azkar_entries', ['id'], `DELETE FROM azkar_entries WHERE id = ? AND ${RESOURCE}`),
      entity('azkar_item', 'azkar_items', ['id'], `DELETE FROM azkar_items WHERE id = ? AND ${RESOURCE}`),
      entity(
        'azkar_segment',
        'azkar_segments',
        ['item_id', 'position'],
        `DELETE FROM azkar_segments WHERE item_id = ? AND position = ? AND ${RESOURCE}`,
      ),
      entity('azkar_category', 'azkar_categories', ['id'], `DELETE FROM azkar_categories WHERE id = ? AND ${RESOURCE}`),
      entity(
        'azkar_entry_category',
        'azkar_entry_categories',
        ['category_id', 'entry_id', 'variation_key'],
        `DELETE FROM azkar_entry_categories WHERE category_id = ? AND entry_id = ? AND variation_key = ? AND ${RESOURCE}`,
      ),
      entity('azkar_note', 'azkar_notes', ['id'], `DELETE FROM azkar_notes WHERE id = ? AND ${RESOURCE}`),
      entity('azkar_recording', 'azkar_recordings', ['id'], `DELETE FROM azkar_recordings WHERE id = ? AND ${RESOURCE}`),
    ],
    deleteResourceSql: [
      `DELETE FROM azkar_segments WHERE ${RESOURCE}`,
      `DELETE FROM azkar_recordings WHERE ${RESOURCE}`,
      `DELETE FROM azkar_notes WHERE ${RESOURCE}`,
      `DELETE FROM azkar_entry_categories WHERE ${RESOURCE}`,
      `DELETE FROM azkar_items WHERE ${RESOURCE}`,
      `DELETE FROM azkar_entries WHERE ${RESOURCE}`,
      `DELETE FROM azkar_categories WHERE ${RESOURCE}`,
      `DELETE FROM azkar_chapters WHERE ${RESOURCE}`,
    ],
  },
  {
    group: 'duas',
    tables: [
      table('dua_items', [
        integer('resource_id'),
        integer('id'),
        text('dua_key'),
        text('kind'),
        integer('group_id', true),
        integer('position'),
      ]),
      table('dua_quran_spans', [
        integer('resource_id'),
        integer('item_id'),
        integer('surah'),
        integer('verse_from'),
        integer('verse_to', true),
      ]),
      table('dua_hadith', [
        integer('resource_id'),
        integer('item_id'),
        integer('hadeeth_id'),
        text('title'),
        text('hadeeth'),
        text('attribution'),
        text('grade', true),
        text('explanation', true),
        text('reference', true),
        text('hints', true),
        text('text_search'),
        text('source_url'),
      ]),
      table('dua_groups', [
        integer('resource_id'),
        integer('id'),
        integer('source_category_id'),
        text('title'),
        integer('position'),
      ]),
      table('dua_links', [
        integer('resource_id'),
        integer('id'),
        integer('item_id'),
        integer('hadeeth_id'),
        text('entry_key'),
      ]),
      table('dua_collection_refs', [
        integer('resource_id'),
        integer('id'),
        integer('item_id'),
        text('collection_slug'),
        text('hadith_number'),
      ]),
      table('dua_collection_books', [
        integer('resource_id'),
        integer('id'),
        text('collection_slug'),
        text('book_number'),
        integer('position'),
      ]),
    ],
    entities: [
      entity('dua_item', 'dua_items', ['id'], `DELETE FROM dua_items WHERE id = ? AND ${RESOURCE}`),
      entity('dua_quran_span', 'dua_quran_spans', ['item_id'], `DELETE FROM dua_quran_spans WHERE item_id = ? AND ${RESOURCE}`),
      entity('dua_hadith', 'dua_hadith', ['item_id'], `DELETE FROM dua_hadith WHERE item_id = ? AND ${RESOURCE}`),
      entity('dua_group', 'dua_groups', ['id'], `DELETE FROM dua_groups WHERE id = ? AND ${RESOURCE}`),
      entity('dua_link', 'dua_links', ['id'], `DELETE FROM dua_links WHERE id = ? AND ${RESOURCE}`),
      entity('dua_collection_ref', 'dua_collection_refs', ['id'], `DELETE FROM dua_collection_refs WHERE id = ? AND ${RESOURCE}`),
      entity('dua_collection_book', 'dua_collection_books', ['id'], `DELETE FROM dua_collection_books WHERE id = ? AND ${RESOURCE}`),
    ],
    deleteResourceSql: [
      `DELETE FROM dua_collection_refs WHERE ${RESOURCE}`,
      `DELETE FROM dua_links WHERE ${RESOURCE}`,
      `DELETE FROM dua_quran_spans WHERE ${RESOURCE}`,
      `DELETE FROM dua_hadith WHERE ${RESOURCE}`,
      `DELETE FROM dua_items WHERE ${RESOURCE}`,
      `DELETE FROM dua_groups WHERE ${RESOURCE}`,
      `DELETE FROM dua_collection_books WHERE ${RESOURCE}`,
    ],
  },
  {
    group: 'names',
    tables: [
      table('names_lists', [
        integer('resource_id'),
        text('list_slug'),
        text('title_ar'),
        text('source_label_ar'),
        text('attribution_ar', true),
        text('attribution_en', true),
        text('edition_reference', true),
        text('source_version'),
      ]),
      table('names', [
        integer('resource_id'),
        integer('id'),
        text('name_slug'),
        integer('position'),
        text('name_ar'),
        text('text_search'),
      ]),
      table('names_verses', [
        integer('resource_id'),
        text('name_slug'),
        text('verse_key'),
        text('review_status'),
        text('evidence', true),
      ]),
      table('names_notes', [
        integer('resource_id'),
        integer('id'),
        text('name_slug'),
        text('kind'),
        text('text_ar', true),
        text('source_type'),
        text('source_name'),
        text('source_reference', true),
        text('source_url', true),
        text('review_status'),
      ]),
    ],
    entities: [
      entity('names_list', 'names_lists', ['list_slug'], `DELETE FROM names_lists WHERE list_slug = ? AND ${RESOURCE}`),
      entity('name', 'names', ['name_slug'], `DELETE FROM names WHERE name_slug = ? AND ${RESOURCE}`),
      entity(
        'names_verse',
        'names_verses',
        ['name_slug', 'verse_key'],
        `DELETE FROM names_verses WHERE name_slug = ? AND verse_key = ? AND ${RESOURCE}`,
      ),
      entity('names_note', 'names_notes', ['id'], `DELETE FROM names_notes WHERE id = ? AND ${RESOURCE}`),
    ],
    deleteResourceSql: [
      `DELETE FROM names_notes WHERE ${RESOURCE}`,
      `DELETE FROM names_verses WHERE ${RESOURCE}`,
      `DELETE FROM names WHERE ${RESOURCE}`,
      `DELETE FROM names_lists WHERE ${RESOURCE}`,
    ],
  },
  {
    group: 'hadith_collections',
    tables: [
      table('hadith_collections', [
        integer('resource_id'),
        integer('id'),
        text('slug'),
        text('source_code'),
        text('title_ar', true),
        text('title_en', true),
        text('author_ar', true),
        text('author_en', true),
        text('attribution_ar'),
        text('attribution_en'),
        text('source_url', true),
        integer('total_hadith'),
        integer('books_count'),
      ]),
      table('hadith_books', [
        integer('resource_id'),
        integer('id'),
        text('book_number'),
        text('title_ar', true),
        text('title_en', true),
        integer('position'),
        integer('hadith_count'),
      ]),
      table('hadith_chapters', [
        integer('resource_id'),
        integer('id'),
        integer('book_id'),
        integer('chapter_number'),
        text('source_chapter_key', true),
        text('title_ar', true),
        text('title_en', true),
        integer('position'),
        integer('hadith_count'),
      ]),
      table('hadith_entries', [
        integer('resource_id'),
        integer('id'),
        integer('book_id'),
        integer('chapter_id', true),
        text('hadith_number'),
        text('arabic_number', true),
        integer('position'),
        text('text_ar'),
        text('text_en', true),
        text('narrator_en', true),
        text('text_search'),
        text('source_url', true),
      ]),
      table('hadith_grades', [
        integer('resource_id'),
        integer('id'),
        integer('entry_id'),
        text('grade'),
        text('graded_by', true),
      ]),
      table('hadith_ref_aliases', [
        integer('resource_id'),
        text('old_number'),
        text('new_number', true),
        text('match'),
        integer('since_version'),
      ]),
    ],
    entities: [
      entity('hadith_collection', 'hadith_collections', ['id'], `DELETE FROM hadith_collections WHERE id = ? AND ${RESOURCE}`),
      entity('hadith_book', 'hadith_books', ['id'], `DELETE FROM hadith_books WHERE id = ? AND ${RESOURCE}`),
      entity('hadith_chapter', 'hadith_chapters', ['id'], `DELETE FROM hadith_chapters WHERE id = ? AND ${RESOURCE}`),
      entity('hadith_entry', 'hadith_entries', ['id'], `DELETE FROM hadith_entries WHERE id = ? AND ${RESOURCE}`),
      entity('hadith_grade', 'hadith_grades', ['id'], `DELETE FROM hadith_grades WHERE id = ? AND ${RESOURCE}`),
      entity(
        'hadith_ref_alias',
        'hadith_ref_aliases',
        ['old_number', 'since_version'],
        `DELETE FROM hadith_ref_aliases WHERE old_number = ? AND since_version = ? AND ${RESOURCE}`,
      ),
    ],
    deleteResourceSql: [
      `DELETE FROM search_hadith WHERE ${RESOURCE}`,
      `DELETE FROM hadith_ref_aliases WHERE ${RESOURCE}`,
      `DELETE FROM hadith_grades WHERE ${RESOURCE}`,
      `DELETE FROM hadith_entries WHERE ${RESOURCE}`,
      `DELETE FROM hadith_chapters WHERE ${RESOURCE}`,
      `DELETE FROM hadith_books WHERE ${RESOURCE}`,
      `DELETE FROM hadith_collections WHERE ${RESOURCE}`,
    ],
    // The FTS delete comes first so a rerun after applyChanges replaces the rows instead of doubling them.
    afterImportSql: [
      `DELETE FROM search_hadith WHERE ${RESOURCE}`,
      'INSERT INTO search_hadith (entry_id, resource_id, text_search) SELECT id, resource_id, text_search FROM hadith_entries WHERE resource_id = ?',
    ],
  },
];

export function contentGroup(group: string): ContentGroupSchema | undefined {
  return CONTENT_GROUPS.find((item) => item.group === group);
}

export function contentContract(): ContentContractGroup[] {
  return CONTENT_GROUPS.map((group) => ({
    group: group.group,
    tables: group.tables.map((item) => ({
      name: item.name,
      columns: item.columns.map((column) => column.name),
    })),
    entities: group.entities.map((item) => ({
      entity: item.entity,
      key: documentedKey(item.keyColumns),
    })),
  }));
}

export function columnList(item: ContentTable): string {
  return item.columns.map((column) => column.name).join(', ');
}

function documentedKey(columns: readonly string[]): string {
  const first = columns[0];
  if (first === undefined) {
    throw new Error('Entity key is empty.');
  }
  if (columns.length === 1) {
    return first;
  }
  return `{${columns.join('}:{')}}`;
}

function table(name: string, columns: readonly ContentColumn[]): ContentTable {
  return { name, columns };
}

function entity(name: string, tableName: string, keyColumns: readonly string[], deleteSql: string): ContentEntity {
  return { entity: name, table: tableName, keyColumns, deleteSql };
}

function integer(name: string, nullable = false): ContentColumn {
  return { name, kind: 'integer', nullable };
}

function text(name: string, nullable = false): ContentColumn {
  return { name, kind: 'text', nullable };
}
