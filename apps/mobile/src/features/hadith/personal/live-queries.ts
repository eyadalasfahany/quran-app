import { and, asc, desc, eq, inArray } from 'drizzle-orm';

import type { UserDatabase } from '@/core/db/user/open';
import { hadithBookmarks, hadithReadingPosition } from '@/core/db/user/schema';

/** Saved hadith, newest first. */
export function liveHadithBookmarksQuery(db: UserDatabase) {
  return db
    .select()
    .from(hadithBookmarks)
    .orderBy(desc(hadithBookmarks.createdAt), asc(hadithBookmarks.collectionSlug), asc(hadithBookmarks.hadithNumber));
}

/** Rows of the collection whose number is any of the given numbers. */
export function liveIsHadithBookmarkedQuery(db: UserDatabase, slug: string, hadithNumbers: readonly string[]) {
  return db
    .select({ hadithNumber: hadithBookmarks.hadithNumber })
    .from(hadithBookmarks)
    .where(and(eq(hadithBookmarks.collectionSlug, slug), inArray(hadithBookmarks.hadithNumber, [...hadithNumbers])))
    .limit(1);
}

export function liveHadithReadingPlaceQuery(db: UserDatabase, slug: string) {
  return db.select().from(hadithReadingPosition).where(eq(hadithReadingPosition.collectionSlug, slug)).limit(1);
}
