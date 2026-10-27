import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const bookmarkKinds = ['verse', 'page'] as const;
export const highlightColors = ['gold', 'green', 'blue', 'rose'] as const;
export const outboxOps = ['upsert', 'delete'] as const;

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
