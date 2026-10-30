import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';

import type { UserDatabase } from '@/core/db/user/open';
import { bookmarks, highlights, notes } from '@/core/db/user/schema';

const bookmarkColumns = {
  id: bookmarks.id,
  verseId: bookmarks.verseId,
  kind: bookmarks.kind,
  page: bookmarks.page,
  clientUpdatedAt: bookmarks.clientUpdatedAt,
};

const highlightColumns = {
  id: highlights.id,
  verseId: highlights.verseId,
  color: highlights.color,
  clientUpdatedAt: highlights.clientUpdatedAt,
};

const noteColumns = {
  id: notes.id,
  verseId: notes.verseId,
  body: notes.body,
  clientUpdatedAt: notes.clientUpdatedAt,
};

export function liveBookmarksQuery(db: UserDatabase) {
  return db
    .select(bookmarkColumns)
    .from(bookmarks)
    .where(isNull(bookmarks.deletedAt))
    .orderBy(desc(bookmarks.clientUpdatedAt), asc(bookmarks.id));
}

export function liveHighlightsQuery(db: UserDatabase, verseIds: readonly number[]) {
  const selected = db.select(highlightColumns).from(highlights);

  if (verseIds.length === 0) {
    return selected.where(sql`1 = 0`).orderBy(asc(highlights.verseId), asc(highlights.id));
  }

  return selected
    .where(and(isNull(highlights.deletedAt), inArray(highlights.verseId, [...verseIds])))
    .orderBy(asc(highlights.verseId), asc(highlights.id));
}

export function liveAllHighlightsQuery(db: UserDatabase) {
  return db
    .select(highlightColumns)
    .from(highlights)
    .where(isNull(highlights.deletedAt))
    .orderBy(asc(highlights.verseId), asc(highlights.id));
}

/** Every live highlight row, newest first, for the My Quran highlights list. */
export function liveAllHighlightRowsQuery(db: UserDatabase) {
  return db
    .select(highlightColumns)
    .from(highlights)
    .where(isNull(highlights.deletedAt))
    .orderBy(desc(highlights.clientUpdatedAt), asc(highlights.id));
}

export function liveNotesQuery(db: UserDatabase, verseId: number) {
  return db
    .select(noteColumns)
    .from(notes)
    .where(and(isNull(notes.deletedAt), eq(notes.verseId, verseId)))
    .orderBy(desc(notes.clientUpdatedAt), asc(notes.id));
}

/** Every live note, newest first, for the My Quran notes list. */
export function liveAllNotesQuery(db: UserDatabase) {
  return db
    .select(noteColumns)
    .from(notes)
    .where(isNull(notes.deletedAt))
    .orderBy(desc(notes.clientUpdatedAt), asc(notes.id));
}
