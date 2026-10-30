import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { openUserDb } from '@/core/db/user/open';

import {
  liveAllHighlightRowsQuery,
  liveAllHighlightsQuery,
  liveAllNotesQuery,
  liveBookmarksQuery,
  liveHighlightsQuery,
  liveNotesQuery,
} from './live-queries';
import type { HighlightColor } from './model';

export function useBookmarks() {
  const { db } = openUserDb();
  return useLiveQuery(liveBookmarksQuery(db));
}

export function useHighlights(verseIds: readonly number[]) {
  const { db } = openUserDb();
  return useLiveQuery(liveHighlightsQuery(db, verseIds), [verseIds.join(',')]);
}

/** Every live highlight keyed by verse id. The map is rebuilt only when the highlight rows change. */
export function useHighlightsByVerseId(): ReadonlyMap<number, HighlightColor> {
  const { db } = openUserDb();
  const { data } = useLiveQuery(liveAllHighlightsQuery(db));
  return useMemo(() => new Map(data.map((row) => [row.verseId, row.color])), [data]);
}

/** Every live highlight row, newest first, for the My Quran highlights tab. */
export function useAllHighlights() {
  const { db } = openUserDb();
  return useLiveQuery(liveAllHighlightRowsQuery(db));
}

export function useNotes(verseId: number) {
  const { db } = openUserDb();
  return useLiveQuery(liveNotesQuery(db, verseId), [verseId]);
}

/** Every live note, newest first, for the My Quran notes tab. */
export function useAllNotes() {
  const { db } = openUserDb();
  return useLiveQuery(liveAllNotesQuery(db));
}
