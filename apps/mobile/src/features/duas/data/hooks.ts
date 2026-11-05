import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';
import { useCatalogVersion } from '@/core/sync/catalog-version';
import { openUserDb } from '@/core/db/user/open';
import { useLocale } from '@/core/i18n';
import { useQuranReferenceLabel } from '@/features/azkar/data';
import { hasPropheticDuas, hasQuranicDuas } from './availability';
import { getPropheticDua, getQuranicDua, listPropheticDuaSections, listQuranicDuas } from './content-repository';
import { listDuaFavoriteCards, type DuaFavoriteCard } from './favorite-cards';
import { liveDuaFavoritesQuery, liveIsDuaFavoriteQuery, liveMyDuasQuery } from './live-queries';
import type { MyDua } from './my-duas-repository';
import type { PropheticDuaDetail, PropheticDuaSection, QuranicDuaDetail, QuranicDuaSummary } from './model';

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
 * Dua favourites, newest first, for the favourites screen. A Quranic card carries its surah and verses (never the
 * verse text); a prophetic card carries its title. Re-reads when the content revision changes.
 */
export function useDuaFavoriteCards(): DuaFavoriteCard[] {
  const revision = useContentRevision();
  const locale = useLocale();
  const quranReference = useQuranReferenceLabel(locale);
  const { db } = openUserDb();
  const { data: favorites } = useLiveQuery(liveDuaFavoritesQuery(db));

  return useMemo(
    () =>
      readOr<DuaFavoriteCard[]>([], () => {
        const { executor } = openContentDb();
        return listDuaFavoriteCards(executor, favorites, quranReference);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [favorites, quranReference, revision],
  );
}
