import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';
import { openUserDb } from '@/core/db/user/open';
import { useCatalogVersion } from '@/core/sync/catalog-version';

import { canonicalHadithNumber } from './covering-number';
import {
  liveHadithBookmarksQuery,
  liveHadithReadingPlaceQuery,
  liveIsHadithBookmarkedQuery,
} from './live-queries';
import type { HadithReadingPlace, SavedHadith, SavedHadithItem } from './model';
import { listSavedHadithItems } from './saved-items';

function readOr<T>(fallback: T, read: () => T): T {
  try {
    return read();
  } catch {
    return fallback;
  }
}

function useContentRevision(): number {
  return useCatalogVersion((state) => state.version);
}

const EMPTY_SAVED: SavedHadithItem[] = [];

type BookmarkRow = {
  collectionSlug: string;
  hadithNumber: string;
  bookNumber: string;
  unverified: number;
  createdAt: number;
};

type PlaceRow = {
  collectionSlug: string;
  hadithNumber: string;
  bookNumber: string;
  unverified: number;
  updatedAt: number;
};

function toSaved(row: BookmarkRow): SavedHadith {
  return {
    collectionSlug: row.collectionSlug,
    hadithNumber: row.hadithNumber,
    bookNumber: row.bookNumber,
    unverified: row.unverified === 1,
    createdAt: row.createdAt,
  };
}

function toPlace(row: PlaceRow): HadithReadingPlace {
  return {
    collectionSlug: row.collectionSlug,
    hadithNumber: row.hadithNumber,
    bookNumber: row.bookNumber,
    unverified: row.unverified === 1,
    updatedAt: row.updatedAt,
  };
}

/**
 * Whether the hadith is saved. The number asked for and its covering number (ADR 0076) both count. Live: it follows
 * user.db change events.
 */
export function useIsHadithBookmarked(slug: string, hadithNumber: string): boolean {
  const { db } = openUserDb();
  const revision = useContentRevision();
  const canonical = useMemo(
    () =>
      readOr(hadithNumber, () => canonicalHadithNumber(openContentDb().executor, slug, hadithNumber)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision, slug, hadithNumber],
  );
  const { data } = useLiveQuery(liveIsHadithBookmarkedQuery(db, slug, [canonical, hadithNumber]), [
    slug,
    canonical,
    hadithNumber,
  ]);
  return data.length > 0;
}

/** Saved hadith, newest first, mapped to `SavedHadith`. */
export function useHadithBookmarks(): SavedHadith[] {
  const { db } = openUserDb();
  const { data } = useLiveQuery(liveHadithBookmarksQuery(db));
  return useMemo(() => data.map(toSaved), [data]);
}

/**
 * The saved list joined with `content.db`, for the saved screen. Re-reads on each change to the saved rows and on each
 * content revision. Returns a stable empty list when `content.db` cannot be opened.
 */
export function useSavedHadithItems(): SavedHadithItem[] {
  const { db, executor } = openUserDb();
  const revision = useContentRevision();
  const { data: bookmarks } = useLiveQuery(liveHadithBookmarksQuery(db));

  return useMemo(
    () =>
      readOr(EMPTY_SAVED, () => {
        const content = openContentDb().executor;
        return listSavedHadithItems({ db: executor, content });
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bookmarks, revision],
  );
}

/** The last-read place of one collection, live. */
export function useHadithReadingPlace(slug: string): HadithReadingPlace | undefined {
  const { db } = openUserDb();
  const { data } = useLiveQuery(liveHadithReadingPlaceQuery(db, slug), [slug]);
  return useMemo(() => {
    const row = data[0];
    return row === undefined ? undefined : toPlace(row);
  }, [data]);
}
