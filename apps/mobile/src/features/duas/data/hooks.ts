import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';
import { useCatalogVersion } from '@/core/sync/catalog-version';
import { openUserDb } from '@/core/db/user/open';
import { useAzkarAvailable } from '@/features/azkar/data';

import { hasDuasContent, hasPropheticDuas, hasQuranicDuas } from './availability';
import { getPropheticDua, getQuranicDua, listPropheticDuaSections, listQuranicDuas } from './content-repository';
import { liveMyDuasQuery } from './live-queries';
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
 * Whether Duas Menu and Home entry points show (ADR 0017). «أدعيتي» needs no content pack; the partial Duas shell stays
 * open. Also show when the `duas` pack, Azkar (Hisn) or any `my_duas` row is present.
 */
export function useDuasAvailable(): boolean {
  const revision = useContentRevision();
  const azkarAvailable = useAzkarAvailable();
  const myDuasCount = useMyDuas().length;
  const hasDuasPack = useMemo(
    () =>
      readOr(false, () => {
        const { executor } = openContentDb();
        return hasDuasContent(executor);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );

  return hasDuasPack || azkarAvailable || myDuasCount > 0;
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
