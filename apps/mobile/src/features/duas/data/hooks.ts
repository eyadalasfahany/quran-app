import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { openContentDb } from '@/core/db/content/open';
import { useCatalogVersion } from '@/core/sync/catalog-version';
import { openUserDb } from '@/core/db/user/open';
import { useLocale } from '@/core/i18n';
import { useFavorites, useQuranReferenceLabel, useQuranReferencesLabel } from '@/features/azkar/data';
import { hasPropheticDuas, hasQuranicDuas } from './availability';
import { getPropheticDua, getQuranicDua, listPropheticDuaSections, listQuranicDuas } from './content-repository';
import { categoryName } from './category-labels';
import { listDuaCategories, listDuaCategoryItems } from './categories';
import { listDuaFavoriteList, type DuaFavoriteListCard } from './favorite-cards';
import { liveDuaFavoritesQuery, liveIsDuaFavoriteQuery, liveMyDuasQuery } from './live-queries';
import { searchDuas, type DuaSearchResult } from './search';
import type { MyDua } from './my-duas-repository';
import type {
  DuaCategory,
  DuaCategoryItem,
  PropheticDuaDetail,
  PropheticDuaSection,
  QuranicDuaDetail,
  QuranicDuaSummary,
} from './model';

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

export function useMyDuas(): MyDua[] {
  const { db } = openUserDb();
  const { data } = useLiveQuery(liveMyDuasQuery(db));
  return useMemo(() => data as MyDua[], [data]);
}

/**
 * Whether Duas Menu and Home entry points show (ADR 0017, ADR 0044 part 5). «أدعيتي» needs no content pack, so Duas
 * stays open even before any `duas` or Azkar pack is installed.
 */
export function useDuasAvailable(): boolean {
  return true;
}

export function usePropheticDuasAvailable(): boolean {
  const revision = useContentRevision();

  return useMemo(
    () =>
      readOr(false, () => {
        const { executor } = openContentDb();
        return hasPropheticDuas(executor);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
}

export function useQuranicDuasAvailable(): boolean {
  const revision = useContentRevision();

  return useMemo(
    () =>
      readOr(false, () => {
        const { executor } = openContentDb();
        return hasQuranicDuas(executor);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
}

export function usePropheticDuaSections(): PropheticDuaSection[] {
  const revision = useContentRevision();

  return useMemo(
    () =>
      readOr([], () => {
        const { executor } = openContentDb();
        return listPropheticDuaSections(executor);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
}

export function usePropheticDua(duaKey: string): PropheticDuaDetail | undefined {
  const revision = useContentRevision();

  return useMemo(
    () =>
      readOr(undefined, () => {
        const { executor } = openContentDb();
        return getPropheticDua(executor, duaKey);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision, duaKey],
  );
}

export function useQuranicDuasList(): QuranicDuaSummary[] {
  const revision = useContentRevision();

  return useMemo(
    () =>
      readOr([], () => {
        const { executor } = openContentDb();
        return listQuranicDuas(executor);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
}

export function useQuranicDua(duaKey: string): QuranicDuaDetail | undefined {
  const revision = useContentRevision();

  return useMemo(
    () =>
      readOr(undefined, () => {
        const { executor } = openContentDb();
        return getQuranicDua(executor, duaKey);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision, duaKey],
  );
}

/** Whether a dua is a favourite. Live: it follows user.db change events, as `useIsFavorite` does for Azkar. */
export function useIsDuaFavorite(duaKey: string): boolean {
  const { db } = openUserDb();
  const { data } = useLiveQuery(liveIsDuaFavoriteQuery(db, duaKey), [duaKey]);
  return data.length > 0;
}

/**
 * The favourites list (screens/, #DuasFavorites): Duas favourites and saved Hisn duas, newest first across both. A
 * Quranic card carries its surah and verses (never the verse text); a prophetic card carries its title. Live: it follows
 * both the Duas and the Azkar favourites. Re-reads when the content revision changes.
 */
export function useDuaFavoriteCards(): DuaFavoriteListCard[] {
  const revision = useContentRevision();
  const locale = useLocale();
  const quranReference = useQuranReferenceLabel(locale);
  const quranReferences = useQuranReferencesLabel(locale);
  const { db } = openUserDb();
  const { data: favorites } = useLiveQuery(liveDuaFavoritesQuery(db));
  const { data: azkarFavorites } = useFavorites();

  return useMemo(
    () =>
      readOr<DuaFavoriteListCard[]>([], () => {
        const { executor } = openContentDb();
        return listDuaFavoriteList(executor, favorites, azkarFavorites, quranReference, quranReferences);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [azkarFavorites, favorites, quranReference, quranReferences, revision],
  );
}

const NO_SEARCH: DuaSearchResult = { categories: [], duas: [] };

/**
 * Duas search for one query (screens/, #DuasSearch). Category names are read in the current language. Re-reads when the
 * catalogue changes or the language does. An empty query returns nothing.
 */
export function useDuaSearch(query: string): DuaSearchResult {
  const revision = useContentRevision();
  const { t } = useTranslation();
  const locale = useLocale();

  return useMemo(() => {
    if (query.trim().length === 0) {
      return NO_SEARCH;
    }
    return readOr<DuaSearchResult>(NO_SEARCH, () => {
      const { executor } = openContentDb();
      return searchDuas(executor, query, (category) => categoryName(category, t, locale));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, t, locale, revision]);
}

/** The Duas categories (ADR 0091), in display order. Re-reads when the catalogue changes. */
export function useDuaCategories(): DuaCategory[] {
  const revision = useContentRevision();

  return useMemo(
    () =>
      readOr<DuaCategory[]>([], () => {
        const { executor } = openContentDb();
        return listDuaCategories(executor);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
}

/** The cards of one Duas category. A Quranic card's reference follows the locale; re-reads on a catalogue change. */
export function useDuaCategoryItems(categoryId: string): DuaCategoryItem[] {
  const revision = useContentRevision();
  const locale = useLocale();
  const quranReference = useQuranReferenceLabel(locale);

  return useMemo(
    () =>
      readOr<DuaCategoryItem[]>([], () => {
        const { executor } = openContentDb();
        return listDuaCategoryItems(executor, categoryId, quranReference);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoryId, quranReference, revision],
  );
}
