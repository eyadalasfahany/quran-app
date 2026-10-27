import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { openUserDb } from '@/core/db/user/open';

import { liveBookmarksQuery, liveHighlightsQuery, liveNotesQuery } from './live-queries';

export function useBookmarks() {
  const { db } = openUserDb();
  return useLiveQuery(liveBookmarksQuery(db));
}

export function useHighlights(verseIds: readonly number[]) {
  const { db } = openUserDb();
  return useLiveQuery(liveHighlightsQuery(db, verseIds), [verseIds.join(',')]);
}

export function useNotes(verseId: number) {
  const { db } = openUserDb();
  return useLiveQuery(liveNotesQuery(db, verseId), [verseId]);
}
