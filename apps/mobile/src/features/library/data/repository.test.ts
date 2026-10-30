import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import { configureUserDatabase } from '@/core/db/user/pragmas';
import type { SqlExecutor, SqlValue } from '@/core/db/sql-executor';

import { applyContentMigrations } from '../../../../jest/apply-content-migrations';
import { openNodeSqlite } from '../../../../jest/node-sqlite-executor';
import { HighlightValidationError, type HighlightColor, NoteValidationError } from './model';
import {
  deleteBookmark,
  deleteNote,
  getHighlights,
  getNotes,
  listBookmarks,
  listHighlights,
  listNotes,
  saveNote,
  setHighlight,
  toggleBookmark,
} from './repository';

jest.mock('expo-crypto', () => ({
  randomUUID: () => globalThis.crypto.randomUUID(),
}));

const AYAH_1_1 = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ';
const migrationsDir = join(process.cwd(), 'src/core/db/user/migrations');

type OutboxRow = {
  seq: number;
  entity: string;
  entity_id: string;
  op: string;
  payload: string;
  client_updated_at: number;
  attempts: number;
};

function openUser(): { database: DatabaseSync; executor: SqlExecutor } {
  const opened = openNodeSqlite(':memory:');
  configureUserDatabase(opened.executor);
  applyContentMigrations(opened.executor, migrationsDir);
  return opened;
}

function outbox(database: DatabaseSync): OutboxRow[] {
  return database
    .prepare(
      `SELECT seq, entity, entity_id, op, payload, client_updated_at, attempts
       FROM outbox ORDER BY seq`,
    )
    .all() as OutboxRow[];
}

function count(database: DatabaseSync, table: 'bookmarks' | 'highlights' | 'notes' | 'outbox'): number {
  const row = database.prepare(`SELECT count(*) AS count FROM ${table}`).get() as { count: number };
  return row.count;
}

function failOnOutbox(executor: SqlExecutor): SqlExecutor {
  return {
    exec(sql) {
      executor.exec(sql);
    },
    run(sql, params) {
      if (sql.includes('outbox')) {
        throw new Error('outbox failed');
      }
      executor.run(sql, params);
    },
    get<T>(sql: string, params?: readonly SqlValue[]) {
      return executor.get<T>(sql, params);
    },
    all<T>(sql: string, params?: readonly SqlValue[]) {
      return executor.all<T>(sql, params);
    },
    transaction<T>(fn: () => T) {
      return executor.transaction(fn);
    },
  };
}

describe('local user data', () => {
  let database: DatabaseSync;
  let executor: SqlExecutor;

  beforeEach(() => {
    const opened = openUser();
    database = opened.database;
    executor = opened.executor;
  });

  afterEach(() => {
    database.close();
  });

  it('toggles a verse bookmark and lists live rows only', () => {
    const created = toggleBookmark(262, { db: executor, now: () => 10, uuid: () => 'bookmark-1' });
    expect(created).toEqual({
      id: 'bookmark-1',
      verseId: 262,
      kind: 'verse',
      page: null,
      clientUpdatedAt: 10,
    });
    const stored = database.prepare(`SELECT dirty, deleted_at FROM bookmarks WHERE id = 'bookmark-1'`).get() as {
      dirty: number;
      deleted_at: number | null;
    };
    expect(stored).toEqual({ dirty: 1, deleted_at: null });
    expect(listBookmarks({ db: executor })).toEqual([created]);

    expect(toggleBookmark(262, { db: executor, now: () => 11 })).toBeNull();
    expect(listBookmarks({ db: executor })).toEqual([]);
    const tombstone = database.prepare(`SELECT dirty, deleted_at FROM bookmarks WHERE id = 'bookmark-1'`).get() as {
      dirty: number;
      deleted_at: number | null;
    };
    expect(tombstone).toEqual({ dirty: 1, deleted_at: 11 });
  });

  it('soft-deletes a bookmark by id and writes a delete to the outbox', () => {
    toggleBookmark(262, { db: executor, now: () => 10, uuid: () => 'bookmark-1' });

    deleteBookmark('bookmark-1', { db: executor, now: () => 11 });

    expect(listBookmarks({ db: executor })).toEqual([]);
    const tombstone = database.prepare(`SELECT dirty, deleted_at FROM bookmarks WHERE id = 'bookmark-1'`).get() as {
      dirty: number;
      deleted_at: number | null;
    };
    expect(tombstone).toEqual({ dirty: 1, deleted_at: 11 });
    // The outbox keeps one row per entity, so the delete replaces the create's upsert.
    const rows = outbox(database);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      entity: 'bookmark',
      entity_id: 'bookmark-1',
      op: 'delete',
      client_updated_at: 11,
      attempts: 0,
    });
    expect(JSON.parse(rows[0]?.payload ?? '{}')).toEqual({ id: 'bookmark-1', client_updated_at: 11 });

    // A missing or already deleted row is a no-op.
    deleteBookmark('bookmark-1', { db: executor, now: () => 12 });
    deleteBookmark('missing', { db: executor, now: () => 13 });
    expect(count(database, 'outbox')).toBe(1);
  });

  it('lists every live highlight across verses, newest first', () => {
    setHighlight(5, 'gold', { db: executor, now: () => 1, uuid: () => 'highlight-1' });
    setHighlight(9, 'rose', { db: executor, now: () => 2, uuid: () => 'highlight-2' });
    setHighlight(5, 'blue', { db: executor, now: () => 3 });

    expect(listHighlights({ db: executor })).toEqual([
      { id: 'highlight-1', verseId: 5, color: 'blue', clientUpdatedAt: 3 },
      { id: 'highlight-2', verseId: 9, color: 'rose', clientUpdatedAt: 2 },
    ]);

    setHighlight(9, null, { db: executor, now: () => 4 });
    expect(listHighlights({ db: executor }).map((row) => row.verseId)).toEqual([5]);
  });

  it('lists every live note across verses, newest first', () => {
    const first = saveNote(1, 'ملاحظة أولى', { db: executor, now: () => 20, uuid: () => 'note-1' });
    const second = saveNote(2, 'ملاحظة ثانية', { db: executor, now: () => 21, uuid: () => 'note-2' });
    saveNote(1, 'محذوفة', { db: executor, now: () => 22, uuid: () => 'note-3' });
    deleteNote('note-3', { db: executor, now: () => 23 });

    expect(listNotes({ db: executor })).toEqual([second, first]);
    expect(count(database, 'notes')).toBe(3);
  });

  it('keeps a single bookmark, replacing the previous one', () => {
    toggleBookmark(262, { db: executor, now: () => 10, uuid: () => 'bookmark-1' });
    const moved = toggleBookmark(1, { db: executor, now: () => 12, uuid: () => 'bookmark-2' });

    expect(moved?.verseId).toBe(1);
    expect(listBookmarks({ db: executor }).map((bookmark) => bookmark.verseId)).toEqual([1]);
    const previous = database.prepare(`SELECT deleted_at FROM bookmarks WHERE id = 'bookmark-1'`).get() as {
      deleted_at: number | null;
    };
    expect(previous.deleted_at).toBe(12);
  });

  it('replaces a live highlight on the same verse and reads only the requested verses', () => {
    const first = setHighlight(5, 'gold', { db: executor, now: () => 1, uuid: () => 'highlight-1' });
    const replaced = setHighlight(5, 'blue', {
      db: executor,
      now: () => 2,
      uuid: () => {
        throw new Error('uuid should not be called');
      },
    });
    setHighlight(9, 'rose', { db: executor, now: () => 3, uuid: () => 'highlight-2' });

    expect(first?.id).toBe('highlight-1');
    expect(replaced).toEqual({ id: 'highlight-1', verseId: 5, color: 'blue', clientUpdatedAt: 2 });
    expect(count(database, 'highlights')).toBe(2);
    expect(getHighlights([5, 9], { db: executor }).map((row) => row.color)).toEqual(['blue', 'rose']);
    expect(getHighlights([4], { db: executor })).toEqual([]);
    expect(getHighlights([])).toEqual([]);

    expect(setHighlight(5, null, { db: executor, now: () => 4 })).toBeNull();
    expect(getHighlights([5], { db: executor })).toEqual([]);
    expect(setHighlight(5, null, { db: executor, now: () => 5 })).toBeNull();
    expect(
      setHighlight(5, 'rose', {
        db: executor,
        now: () => 6,
        uuid: () => {
          throw new Error('uuid should not be called');
        },
      }),
    ).toEqual({ id: 'highlight-1', verseId: 5, color: 'rose', clientUpdatedAt: 6 });
  });

  it('rejects an unknown highlight colour before writing', () => {
    expect(() => setHighlight(1, 'purple' as HighlightColor, { db: executor })).toThrow(HighlightValidationError);
    expect(count(database, 'highlights')).toBe(0);
    expect(count(database, 'outbox')).toBe(0);
  });

  it('saves notes trimmed of surrounding whitespace and lists live notes for that verse', () => {
    const pasted = ` \n\t${AYAH_1_1}  \n`;
    const note = saveNote(1, pasted, { db: executor, now: () => 20, uuid: () => 'note-1' });
    const internal = 'بِسْمِ  ٱللَّهِ\tٱلرَّحْمَـٰنِ';
    const second = saveNote(1, `  ${internal}  `, { db: executor, now: () => 21, uuid: () => 'note-2' });
    saveNote(2, 'آية أخرى', { db: executor, now: () => 22, uuid: () => 'note-3' });

    expect(note.body).toBe(AYAH_1_1);
    expect(Array.from(note.body, (character) => character.codePointAt(0))).toEqual(
      Array.from(AYAH_1_1, (character) => character.codePointAt(0)),
    );
    expect(second.body).toBe(internal);
    expect(getNotes(1, { db: executor })).toEqual([second, note]);

    deleteNote('note-2', { db: executor, now: () => 23 });
    expect(getNotes(1, { db: executor })).toEqual([note]);
    deleteNote('missing', { db: executor, now: () => 24 });
    expect(count(database, 'notes')).toBe(3);
  });

  it('rejects an empty note and a note over 10,000 characters', () => {
    expect(() => saveNote(1, ' \n\t ', { db: executor })).toThrow(NoteValidationError);
    try {
      saveNote(1, ' ', { db: executor });
    } catch (error) {
      expect(error).toBeInstanceOf(NoteValidationError);
      expect((error as NoteValidationError).code).toBe('note_empty');
    }

    const limit = 'ا'.repeat(10_000);
    const saved = saveNote(1, ` ${limit} `, { db: executor, now: () => 1, uuid: () => 'note-limit' });
    expect(saved.body).toBe(limit);
    expect(Array.from(saved.body).length).toBe(10_000);

    expect(() => saveNote(1, `${limit}ا`, { db: executor, now: () => 2, uuid: () => 'note-over' })).toThrow(
      NoteValidationError,
    );
    try {
      saveNote(1, ` ${limit}ا `, { db: executor });
    } catch (error) {
      expect(error).toBeInstanceOf(NoteValidationError);
      expect((error as NoteValidationError).code).toBe('note_too_long');
    }
    expect(count(database, 'notes')).toBe(1);
    expect(count(database, 'outbox')).toBe(1);
  });

  it('keeps one outbox row per item, with the latest payload, and a delete replaces an upsert', () => {
    setHighlight(7, 'gold', { db: executor, now: () => 1, uuid: () => 'highlight-1' });
    database.prepare(`UPDATE outbox SET attempts = 4`).run();
    setHighlight(7, 'green', { db: executor, now: () => 2 });

    let rows = outbox(database);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      seq: 1,
      entity: 'highlight',
      entity_id: 'highlight-1',
      op: 'upsert',
      client_updated_at: 2,
      attempts: 0,
    });
    expect(JSON.parse(rows[0]?.payload ?? '{}')).toEqual({
      id: 'highlight-1',
      verse_id: 7,
      color: 'green',
      client_updated_at: 2,
    });

    toggleBookmark(7, { db: executor, now: () => 3, uuid: () => 'bookmark-1' });
    toggleBookmark(7, { db: executor, now: () => 4 });
    rows = outbox(database);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toMatchObject({ entity: 'bookmark', entity_id: 'bookmark-1', op: 'delete', client_updated_at: 4 });
    expect(JSON.parse(rows[1]?.payload ?? '{}')).toEqual({ id: 'bookmark-1', client_updated_at: 4 });

    const note = saveNote(7, 'ملاحظة', { db: executor, now: () => 5, uuid: () => 'note-1' });
    deleteNote(note.id, { db: executor, now: () => 6 });
    rows = outbox(database);
    expect(rows.filter((row) => row.entity === 'note')).toEqual([
      expect.objectContaining({ entity_id: 'note-1', op: 'delete', client_updated_at: 6, attempts: 0 }),
    ]);

    toggleBookmark(7, {
      db: executor,
      now: () => 7,
      uuid: () => {
        throw new Error('uuid should not be called');
      },
    });
    const revived = outbox(database).find((row) => row.entity === 'bookmark');
    expect(revived).toMatchObject({ entity_id: 'bookmark-1', op: 'upsert', client_updated_at: 7 });
    expect(listBookmarks({ db: executor })).toEqual([
      { id: 'bookmark-1', verseId: 7, kind: 'verse', page: null, clientUpdatedAt: 7 },
    ]);
  });

  it('rolls back the row and the outbox when the transaction throws', () => {
    expect(() => toggleBookmark(1, { db: failOnOutbox(executor), now: () => 1, uuid: () => 'bookmark-1' })).toThrow(
      'outbox failed',
    );
    expect(count(database, 'bookmarks')).toBe(0);
    expect(count(database, 'outbox')).toBe(0);

    const created = toggleBookmark(1, { db: executor, now: () => 2, uuid: () => 'bookmark-1' });
    expect(created?.id).toBe('bookmark-1');
    expect(count(database, 'bookmarks')).toBe(1);
    expect(count(database, 'outbox')).toBe(1);
  });

  it('rolls back the note and the outbox when saveNote transaction throws', () => {
    expect(() => saveNote(1, 'ملاحظة', { db: failOnOutbox(executor), now: () => 1, uuid: () => 'note-1' })).toThrow(
      'outbox failed',
    );
    expect(count(database, 'notes')).toBe(0);
    expect(count(database, 'outbox')).toBe(0);
  });

  it('uses expo-crypto randomUUID when the caller does not pass one', () => {
    const created = toggleBookmark(3, { db: executor, now: () => 1 });
    expect(created?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
