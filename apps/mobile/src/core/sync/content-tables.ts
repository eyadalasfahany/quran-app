export type PackGroup = 'translations' | 'tafsirs' | 'mushafs' | 'chapter_recitations';

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
};

export type ContentContractGroup = {
  group: PackGroup;
  tables: { name: string; columns: string[] }[];
  entities: { entity: string; key: string }[];
};

const RESOURCE = 'resource_id = ?';

export const CONTENT_GROUPS: readonly ContentGroupSchema[] = [
  {
    group: 'translations',
    tables: [
      table('translation_entries', [
        integer('resource_id'),
        integer('verse_id'),
        text('text'),
        text('footnotes', true),
      ]),
    ],
    entities: [
      entity(
        'translation_entry',
        'translation_entries',
        ['verse_id'],
        `DELETE FROM translation_entries WHERE verse_id = ? AND ${RESOURCE}`,
      ),
    ],
    deleteResourceSql: [`DELETE FROM translation_entries WHERE ${RESOURCE}`],
  },
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
