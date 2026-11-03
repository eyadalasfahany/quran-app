import { useMemo } from 'react';

import { openContentDb } from '@/core/db/content/open';
import { openUserDb } from '@/core/db/user/open';
import { useCatalogVersion } from '@/core/sync/catalog-version';

import { hasNamesContent } from './availability';
import { getNameBySlug, getNamesList, listNames } from './content-repository';
import type { NameDetail, NameSummary, NamesListMeta } from './model';
import { readNamesViewMode, type NamesViewMode, writeNamesViewMode } from './view-mode';

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

export function useNamesAvailable(): boolean {
  const revision = useContentRevision();
  return useMemo(
    () =>
      readOr(false, () => {
        const { executor } = openContentDb();
        return hasNamesContent(executor);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
}

export function useNamesListMeta(): NamesListMeta | null {
  const revision = useContentRevision();
  return useMemo(
    () =>
      readOr(null, () => {
        const { executor } = openContentDb();
        return getNamesList(executor);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
}

export function useNamesSummaries(): NameSummary[] {
  const revision = useContentRevision();
  return useMemo(
    () =>
      readOr([], () => {
        const { executor } = openContentDb();
        const { executor: userExecutor } = openUserDb();
        return listNames(executor, userExecutor);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
}

export function useNameDetail(nameSlug: string): NameDetail | null {
  const revision = useContentRevision();
  return useMemo(
    () =>
      readOr(null, () => {
        const { executor } = openContentDb();
        const { executor: userExecutor } = openUserDb();
        return getNameBySlug(executor, nameSlug, userExecutor);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision, nameSlug],
  );
}

export function useNamesViewMode(): [NamesViewMode, (mode: NamesViewMode) => void] {
  const mode = readNamesViewMode();
  return [mode, writeNamesViewMode];
}
