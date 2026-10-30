import { sql } from 'drizzle-orm';
import { check, index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const bookmarkKinds = ['verse', 'page'] as const;
export const highlightColors = ['gold', 'green', 'blue', 'rose'] as const;
export const outboxOps = ['upsert', 'delete'] as const;
export const downloadStatuses = ['queued', 'downloading', 'paused', 'waiting_wifi', 'done', 'failed'] as const;
export const khatmaPlanStatuses = ['active', 'completed', 'abandoned'] as const;

export const NOTE_MAX_CHARACTERS = 10_000;

const syncColumns = {
  clientUpdatedAt: integer('client_updated_at').notNull(),
  deletedAt: integer('deleted_at'),
  dirty: integer('dirty').notNull(),
};

export const bookmarks = sqliteTable(
  'bookmarks',
  {
    id: text('id').primaryKey(),
    verseId: integer('verse_id').notNull(),
    kind: text('kind', { enum: bookmarkKinds }).notNull(),
    page: integer('page'),
    ...syncColumns,
  },
  (table) => [
    index('bookmarks_verse_id_idx').on(table.verseId),
    uniqueIndex('bookmarks_live_kind_verse_idx')
      .on(table.kind, table.verseId)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const highlights = sqliteTable(
  'highlights',
  {
    id: text('id').primaryKey(),
    verseId: integer('verse_id').notNull(),
    color: text('color', { enum: highlightColors }).notNull(),
    ...syncColumns,
  },
  (table) => [
    index('highlights_verse_id_idx').on(table.verseId),
    uniqueIndex('highlights_live_verse_idx')
      .on(table.verseId)
      .where(sql`${table.deletedAt} is null`),
  ],
);

export const notes = sqliteTable(
  'notes',
  {
    id: text('id').primaryKey(),
    verseId: integer('verse_id').notNull(),
    body: text('body').notNull(),
    ...syncColumns,
  },
  (table) => [
    index('notes_verse_id_idx').on(table.verseId),
    check('notes_body_length', sql`length(${table.body}) between 1 and ${sql.raw(String(NOTE_MAX_CHARACTERS))}`),
  ],
);

// Personal listening history for Home's «آخر ما استمعت إليه». Local only: no sync columns and no outbox.
// Keyed by QF's audio file id, so playing a surah again updates its row; pruned to 20 rows on write.
export const recentListens = sqliteTable('recent_listens', {
  audioFileId: integer('audio_file_id').primaryKey(),
  reciterResourceId: integer('reciter_resource_id').notNull(),
  chapterId: integer('chapter_id').notNull(),
  lastPositionMs: integer('last_position_ms').notNull(),
  playedAt: integer('played_at').notNull(),
});

// Downloaded recitation audio, one row per QF audio file (step 7). Local only: no sync columns, no outbox.
// `audio_url` and `source_size_bytes` snapshot the content row at download time, so verification can tell
// whether QF's file changed. `source_size_bytes` is in the content row's own units (KB for some reciters).
export const downloads = sqliteTable(
  'downloads',
  {
    audioFileId: integer('audio_file_id').primaryKey(),
    reciterResourceId: integer('reciter_resource_id').notNull(),
    chapterId: integer('chapter_id').notNull(),
    audioUrl: text('audio_url').notNull(),
    sourceSizeBytes: integer('source_size_bytes'),
    localPath: text('local_path').notNull(),
    sizeBytes: integer('size_bytes'),
    status: text('status', { enum: downloadStatuses }).notNull(),
    progress: real('progress').notNull().default(0),
    resumeData: text('resume_data'),
    downloadedAt: integer('downloaded_at'),
    verifiedAt: integer('verified_at'),
  },
  (table) => [index('downloads_reciter_resource_id_idx').on(table.reciterResourceId)],
);

export const outbox = sqliteTable(
  'outbox',
  {
    seq: integer('seq').primaryKey({ autoIncrement: true }),
    entity: text('entity').notNull(),
    entityId: text('entity_id').notNull(),
    op: text('op', { enum: outboxOps }).notNull(),
    payload: text('payload').notNull(),
    clientUpdatedAt: integer('client_updated_at').notNull(),
    attempts: integer('attempts').notNull().default(0),
  },
  (table) => [uniqueIndex('outbox_entity_idx').on(table.entity, table.entityId)],
);

export const syncMeta = sqliteTable('sync_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export const khatmaPlans = sqliteTable(
  'khatma_plans',
  {
    id: text('id').primaryKey(),
    durationDays: integer('duration_days').notNull(),
    startVerseId: integer('start_verse_id').notNull(),
    startDate: text('start_date').notNull(),
    status: text('status', { enum: khatmaPlanStatuses }).notNull(),
    completedAt: integer('completed_at'),
    ...syncColumns,
  },
  (table) => [
    uniqueIndex('khatma_plans_one_active_idx')
      .on(table.status)
      .where(sql`${table.status} = 'active' AND ${table.deletedAt} is null`),
  ],
);

export const khatmaLogs = sqliteTable(
  'khatma_logs',
  {
    id: text('id').primaryKey(),
    planId: text('plan_id').notNull(),
    date: text('date').notNull(),
    pagesRead: integer('pages_read').notNull(),
    lastVerseId: integer('last_verse_id').notNull(),
    ...syncColumns,
  },
  (table) => [
    index('khatma_logs_plan_id_idx').on(table.planId),
    uniqueIndex('khatma_logs_live_plan_date_idx')
      .on(table.planId, table.date)
      .where(sql`${table.deletedAt} is null`),
  ],
);
