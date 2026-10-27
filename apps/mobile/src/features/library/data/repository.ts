import { randomUUID } from 'expo-crypto';

import { openUserDb } from '@/core/db/user/open';
import type { SqlExecutor } from '@/core/db/sql-executor';

import {
  type Bookmark,
  type BookmarkKind,
  type Highlight,
  HighlightValidationError,
  type HighlightColor,
  isBookmarkKind,
  isHighlightColor,
  type Note,
  prepareNoteBody,
} from './model';

export type UserStore = {
  db?: SqlExecutor;
  now?: () => number;
  uuid?: () => string;
};

type ResolvedStore = {
  db: SqlExecutor;
  now: () => number;
  uuid: () => string;
};

type OutboxOp = 'upsert' | 'delete';

type BookmarkRow = {
  id: string;
  verseId: number;
  kind: string;
  page: number | null;
  clientUpdatedAt: number;
};

type HighlightRow = {
  id: string;
  verseId: number;
  color: string;
  clientUpdatedAt: number;
};

type NoteRow = {
  id: string;
  verseId: number;
  body: string;
  clientUpdatedAt: number;
};

const BOOKMARK_SELECT = `
  SELECT id, verse_id AS verseId, kind, page, client_updated_at AS clientUpdatedAt
  FROM bookmarks
`;

const HIGHLIGHT_SELECT = `
  SELECT id, verse_id AS verseId, color, client_updated_at AS clientUpdatedAt
  FROM highlights
`;

const NOTE_SELECT = `
  SELECT id, verse_id AS verseId, body, client_updated_at AS clientUpdatedAt
  FROM notes
`;

export function toggleBookmark(verseId: number, store?: UserStore): Bookmark | null {
  const { db, now, uuid } = resolveStore(store);

  return db.transaction(() => {
    const clientUpdatedAt = now();
    const live = liveVerseBookmark(db, verseId);

    if (live) {
      softDelete(db, 'bookmarks', live.id, clientUpdatedAt);
      writeOutbox(db, {
        entity: 'bookmark',
        entityId: live.id,
        op: 'delete',
        payload: deletePayload(live.id, clientUpdatedAt),
        clientUpdatedAt,
      });
      return null;
    }

    const tombstoneId = latestTombstoneId(db, 'bookmarks', verseId, 'verse');
    const id = tombstoneId ?? uuid();
    const bookmark: Bookmark = { id, verseId, kind: 'verse', page: null, clientUpdatedAt };

    if (tombstoneId) {
      db.run(
        `UPDATE bookmarks
         SET kind = 'verse', page = NULL, client_updated_at = ?, deleted_at = NULL, dirty = 1
         WHERE id = ?`,
        [clientUpdatedAt, id],
      );
    } else {
      db.run(
        `INSERT INTO bookmarks (id, verse_id, kind, page, client_updated_at, deleted_at, dirty)
         VALUES (?, ?, 'verse', NULL, ?, NULL, 1)`,
        [id, verseId, clientUpdatedAt],
      );
    }

    writeOutbox(db, {
      entity: 'bookmark',
      entityId: id,
      op: 'upsert',
      payload: JSON.stringify({
        id,
        verse_id: verseId,
        kind: 'verse',
        page: null,
        client_updated_at: clientUpdatedAt,
      }),
      clientUpdatedAt,
    });

    return bookmark;
  });
}

export function setHighlight(verseId: number, color: HighlightColor | null, store?: UserStore): Highlight | null {
  if (color !== null && !isHighlightColor(color)) {
    throw new HighlightValidationError();
  }

  const { db, now, uuid } = resolveStore(store);

  return db.transaction(() => {
    const clientUpdatedAt = now();
    const live = db.get<HighlightRow>(`${HIGHLIGHT_SELECT} WHERE verse_id = ? AND deleted_at IS NULL`, [verseId]);

    if (color === null) {
      if (live === undefined) {
        return null;
      }

      softDelete(db, 'highlights', live.id, clientUpdatedAt);
      writeOutbox(db, {
        entity: 'highlight',
        entityId: live.id,
        op: 'delete',
        payload: deletePayload(live.id, clientUpdatedAt),
        clientUpdatedAt,
      });
      return null;
    }

    const tombstoneId = live === undefined ? latestTombstoneId(db, 'highlights', verseId) : undefined;
    const id = live?.id ?? tombstoneId ?? uuid();

    if (live !== undefined || tombstoneId !== undefined) {
      db.run(
        `UPDATE highlights
         SET color = ?, client_updated_at = ?, deleted_at = NULL, dirty = 1
         WHERE id = ?`,
        [color, clientUpdatedAt, id],
      );
    } else {
      db.run(
        `INSERT INTO highlights (id, verse_id, color, client_updated_at, deleted_at, dirty)
         VALUES (?, ?, ?, ?, NULL, 1)`,
        [id, verseId, color, clientUpdatedAt],
      );
    }

    const highlight: Highlight = { id, verseId, color, clientUpdatedAt };
    writeOutbox(db, {
      entity: 'highlight',
      entityId: id,
      op: 'upsert',
      payload: JSON.stringify({
        id,
        verse_id: verseId,
        color,
        client_updated_at: clientUpdatedAt,
      }),
      clientUpdatedAt,
    });

    return highlight;
  });
}

export function saveNote(verseId: number, body: string, store?: UserStore): Note {
  const trimmed = prepareNoteBody(body);
  const { db, now, uuid } = resolveStore(store);

  return db.transaction(() => {
    const id = uuid();
    const clientUpdatedAt = now();
    db.run(
      `INSERT INTO notes (id, verse_id, body, client_updated_at, deleted_at, dirty)
       VALUES (?, ?, ?, ?, NULL, 1)`,
      [id, verseId, trimmed, clientUpdatedAt],
    );

    const note: Note = { id, verseId, body: trimmed, clientUpdatedAt };
    writeOutbox(db, {
      entity: 'note',
      entityId: id,
      op: 'upsert',
      payload: JSON.stringify({
        id,
        verse_id: verseId,
        body: trimmed,
        client_updated_at: clientUpdatedAt,
      }),
      clientUpdatedAt,
    });

    return note;
  });
}

export function deleteNote(id: string, store?: UserStore): void {
  const { db, now } = resolveStore(store);

  db.transaction(() => {
    const live = db.get<{ id: string }>(`SELECT id FROM notes WHERE id = ? AND deleted_at IS NULL`, [id]);
    if (live === undefined) {
      return;
    }

    const clientUpdatedAt = now();
    softDelete(db, 'notes', id, clientUpdatedAt);
    writeOutbox(db, {
      entity: 'note',
      entityId: id,
      op: 'delete',
      payload: deletePayload(id, clientUpdatedAt),
      clientUpdatedAt,
    });
  });
}

export function listBookmarks(store?: UserStore): Bookmark[] {
  const { db } = resolveStore(store);
  return db
    .all<BookmarkRow>(`${BOOKMARK_SELECT} WHERE deleted_at IS NULL ORDER BY client_updated_at DESC, id ASC`)
    .map(asBookmark);
}

export function getHighlights(verseIds: readonly number[], store?: UserStore): Highlight[] {
  if (verseIds.length === 0) {
    return [];
  }

  const { db } = resolveStore(store);
  const placeholders = verseIds.map(() => '?').join(', ');

  return db
    .all<HighlightRow>(
      `${HIGHLIGHT_SELECT} WHERE deleted_at IS NULL AND verse_id IN (${placeholders}) ORDER BY verse_id ASC, id ASC`,
      [...verseIds],
    )
    .map(asHighlight);
}

export function getNotes(verseId: number, store?: UserStore): Note[] {
  const { db } = resolveStore(store);
  return db.all<NoteRow>(
    `${NOTE_SELECT} WHERE verse_id = ? AND deleted_at IS NULL ORDER BY client_updated_at DESC, id ASC`,
    [verseId],
  );
}

function resolveStore(store?: UserStore): ResolvedStore {
  return {
    db: store?.db ?? defaultExecutor(),
    now: store?.now ?? Date.now,
    uuid: store?.uuid ?? randomUUID,
  };
}

function defaultExecutor(): SqlExecutor {
  return openUserDb().executor;
}

function liveVerseBookmark(db: SqlExecutor, verseId: number): Bookmark | undefined {
  const row = db.get<BookmarkRow>(`${BOOKMARK_SELECT} WHERE verse_id = ? AND kind = 'verse' AND deleted_at IS NULL`, [
    verseId,
  ]);
  return row === undefined ? undefined : asBookmark(row);
}

function latestTombstoneId(
  db: SqlExecutor,
  table: 'bookmarks' | 'highlights',
  verseId: number,
  kind?: BookmarkKind,
): string | undefined {
  if (kind === undefined) {
    return db.get<{ id: string }>(
      `SELECT id FROM ${table}
       WHERE verse_id = ? AND deleted_at IS NOT NULL
       ORDER BY client_updated_at DESC, id DESC
       LIMIT 1`,
      [verseId],
    )?.id;
  }

  return db.get<{ id: string }>(
    `SELECT id FROM ${table}
     WHERE verse_id = ? AND kind = ? AND deleted_at IS NOT NULL
     ORDER BY client_updated_at DESC, id DESC
     LIMIT 1`,
    [verseId, kind],
  )?.id;
}

function softDelete(
  db: SqlExecutor,
  table: 'bookmarks' | 'highlights' | 'notes',
  id: string,
  clientUpdatedAt: number,
): void {
  db.run(`UPDATE ${table} SET deleted_at = ?, client_updated_at = ?, dirty = 1 WHERE id = ?`, [
    clientUpdatedAt,
    clientUpdatedAt,
    id,
  ]);
}

function writeOutbox(
  db: SqlExecutor,
  change: { entity: string; entityId: string; op: OutboxOp; payload: string; clientUpdatedAt: number },
): void {
  db.run(
    `INSERT INTO outbox (entity, entity_id, op, payload, client_updated_at, attempts)
     VALUES (?, ?, ?, ?, ?, 0)
     ON CONFLICT(entity, entity_id) DO UPDATE SET
       op = excluded.op,
       payload = excluded.payload,
       client_updated_at = excluded.client_updated_at,
       attempts = 0`,
    [change.entity, change.entityId, change.op, change.payload, change.clientUpdatedAt],
  );
}

function deletePayload(id: string, clientUpdatedAt: number): string {
  return JSON.stringify({ id, client_updated_at: clientUpdatedAt });
}

function asBookmark(row: BookmarkRow): Bookmark {
  if (!isBookmarkKind(row.kind)) {
    throw new Error(`Unknown bookmark kind "${row.kind}".`);
  }

  return { ...row, kind: row.kind };
}

function asHighlight(row: HighlightRow): Highlight {
  if (!isHighlightColor(row.color)) {
    throw new Error(`Unknown highlight color "${row.color}".`);
  }

  return { ...row, color: row.color };
}
