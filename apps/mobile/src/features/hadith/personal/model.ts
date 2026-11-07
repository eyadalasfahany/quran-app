import type { SqlExecutor } from '@/core/db/sql-executor';
import type { HadithBook, HadithCollectionRef, HadithDetail } from '../types';

/** What the reader knows when the user saves or reads: the slug, the number as printed, and the book number. */
export type HadithPlaceInput = { slug: string; hadithNumber: string; bookNumber: string };

export type SavedHadith = {
  collectionSlug: string;
  hadithNumber: string;
  bookNumber: string;
  /** True after an alias that is not `exact_text` (or an `exact_text` with no new number). Shown at book level. */
  unverified: boolean;
  createdAt: number;
};

export type HadithReadingPlace = {
  collectionSlug: string;
  hadithNumber: string;
  bookNumber: string;
  unverified: boolean;
  updatedAt: number;
};

/**
 * Maps a number that is not a hadith of its own (merged into a covering hadith, ADR 0076) to the covering hadith's
 * `hadith_number`. Returns null when the number is not merged. Never throws.
 */
export type HadithNumberResolver = (content: SqlExecutor, slug: string, hadithNumber: string) => string | null;

/** The databases and clock the repositories use. Every field has a default; tests pass all of them. */
export type HadithPersonalStore = {
  /** `user.db`. Default `openUserDb().executor`. */
  db?: SqlExecutor;
  /** `content.db`. Default `openContentDb().executor`; if it cannot be opened, content lookups are skipped. */
  content?: SqlExecutor;
  /** Default `resolveCoveringNumber`. */
  resolver?: HadithNumberResolver;
  /** Default `Date.now`. */
  now?: () => number;
};

/** One saved hadith joined with `content.db`, for the saved list (step 13 builds `SavedHadithRowData` from it). */
export type SavedHadithItem = {
  saved: SavedHadith;
  /** Null when the collection is not installed. */
  collection: HadithCollectionRef | null;
  /** The saved book number looked up in the collection; null when not installed or the book no longer exists. */
  book: Pick<HadithBook, 'id' | 'bookNumber' | 'titleAr' | 'titleEn'> | null;
  /** The hadith the item opens, confirmed in the pack (merged numbers resolved). Null when unverified or missing. */
  hadith: HadithDetail | null;
  /** `hadith.hadithNumber` when verified, else null. This is the number the reader route opens. */
  openNumber: string | null;
};

export type AliasApplyResult = { rewritten: number; unverified: number; unchanged: number };

/** For React keys, tests and logs. It is never stored. */
export function hadithKey(slug: string, hadithNumber: string): string {
  return `${slug}:${hadithNumber}`;
}
