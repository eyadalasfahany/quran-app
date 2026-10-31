import type { TFunction } from 'i18next';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { openContentDb } from '@/core/db/content/open';
import { openUserDb } from '@/core/db/user/open';
import type { Locale } from '@/core/i18n/locale';
import { useCatalogVersion } from '@/core/sync/catalog-version';

import {
  getEntry,
  hasAzkarContent,
  listCategories,
  listCategoryIds,
  listCategoryUnits,
  type VariationOverrides,
} from './content-repository';
import { readAzkarFontScale, saveAzkarFontScale } from './font-scale';
import { liveFavoritesQuery, liveIsFavoriteQuery, liveProgressSummaryQuery, liveScopeProgressQuery } from './live-queries';
import type { AzkarCategoryListItem, AzkarEntryDetail } from './model';
import { pickLastActiveScope, type ScopeResolution, type ScopeSummary } from './progress';
import type { ReaderUnit } from './reader-units';
import { matchesCategoryLabel, searchAzkarEntries, type AzkarSearchHit } from './search';
import { getVariationChoices, setVariationChoice, type VariationChoices } from './variation-choice';

/**
 * Content hooks read `content.db` and re-read whenever the catalogue version changes. The version is bumped after
 * every catalogue write and every pack import (see `core/sync`), so an install or a content sync re-runs them. Personal
 * hooks are live: they re-run on user.db change events.
 */

const NO_OVERRIDES: VariationOverrides = {};

/** Runs a read that can fail before the content migrations have applied; the fallback keeps the UI empty. */
function readOr<T>(fallback: T, read: () => T): T {
  try {
    return read();
  } catch {
    return fallback;
  }
}

/** The content revision: bumped after every catalogue write and pack import. Content hooks re-read when it moves. */
function useContentRevision(): number {
  return useCatalogVersion((state) => state.version);
}

export function useAzkarAvailable(): boolean {
  const revision = useContentRevision();
  const { executor } = openContentDb();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => readOr(false, () => hasAzkarContent(executor)), [executor, revision]);
}

export function useAzkarCategories(locale: Locale): AzkarCategoryListItem[] {
  const revision = useContentRevision();
  const { executor } = openContentDb();
  return useMemo(
    () => readOr<AzkarCategoryListItem[]>([], () => listCategories(executor, locale)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [executor, locale, revision],
  );
}

/** A category's reader units. `overrides` comes from `useVariationChoices` (memoised by the caller). */
export function useCategoryUnits(
  categoryId: string,
  locale: Locale,
  overrides: VariationOverrides = NO_OVERRIDES,
): ReaderUnit[] {
  const revision = useContentRevision();
  const { executor } = openContentDb();
  return useMemo(
    () => readOr<ReaderUnit[]>([], () => listCategoryUnits(executor, categoryId, locale, overrides)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [executor, categoryId, locale, overrides, revision],
  );
}

export function useEntry(entryKey: string, overrides: VariationOverrides = NO_OVERRIDES): AzkarEntryDetail | undefined {
  const revision = useContentRevision();
  const { executor } = openContentDb();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => readOr(undefined, () => getEntry(executor, entryKey, overrides)), [executor, entryKey, overrides, revision]);
}

/** Entry hits from segment text, and the ids of categories whose localised label matches the query. */
export function useAzkarSearch(query: string): { entries: AzkarSearchHit[]; categoryIds: string[] } {
  const revision = useContentRevision();
  const { executor } = openContentDb();
  const { t } = useTranslation();

  return useMemo(() => {
    if (query.trim().length === 0) {
      return { entries: [], categoryIds: [] };
    }

    const entries = readOr<AzkarSearchHit[]>([], () => searchAzkarEntries(executor, query));
    const categoryIds = readOr<string[]>([], () =>
      listCategoryIds(executor).filter((id) => matchesCategoryLabel(query, categoryLabel(t, id))),
    );

    return { entries, categoryIds };
    // `t` changes with the language, so the labels follow it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [executor, query, t, revision]);
}

/**
 * The reader's alternative per entry, saved in MMKV. `choose` saves one entry's alternative and updates the map, so
 * every hook and screen that passes `choices` re-reads its units.
 */
export function useVariationChoices(): { choices: VariationChoices; choose: (entryKey: string, variationKey: string) => void } {
  const [choices, setChoices] = useState(getVariationChoices);
  const choose = useCallback((entryKey: string, variationKey: string) => {
    setChoices(setVariationChoice(entryKey, variationKey));
  }, []);
  return { choices, choose };
}

/** Text size for Azkar, saved in MMKV. */
export function useAzkarFontScale(): [number, (value: number) => void] {
  const [scale, setScale] = useState(readAzkarFontScale);
  const update = useCallback((value: number) => setScale(saveAzkarFontScale(value)), []);
  return [scale, update];
}

export function useScopeProgress(scopeKey: string, periodKey: string) {
  const { db } = openUserDb();
  return useLiveQuery(liveScopeProgressQuery(db, scopeKey, periodKey), [scopeKey, periodKey]);
}

/** The scope behind Home's «تابع» card. `resolve` must be stable (memoised by the caller). */
export function useContinueScope(resolve: (scopeKey: string) => ScopeResolution | null) {
  const { db } = openUserDb();
  const { data } = useLiveQuery(liveProgressSummaryQuery(db));

  return useMemo(() => {
    const summaries: ScopeSummary[] = data.map((row) => ({
      scopeKey: row.scopeKey,
      periodKey: row.periodKey,
      completedUnits: Number(row.completedUnits),
      updatedAt: row.updatedAt ?? 0,
    }));
    return pickLastActiveScope(summaries, resolve);
  }, [data, resolve]);
}

export function useFavorites() {
  const { db } = openUserDb();
  return useLiveQuery(liveFavoritesQuery(db));
}

export function useIsFavorite(entryKey: string): boolean {
  const { db } = openUserDb();
  const { data } = useLiveQuery(liveIsFavoriteQuery(db, entryKey), [entryKey]);
  return data.length > 0;
}

/**
 * The localised label of a category (`azkar.categories.<id>`). Category ids come from content, so the key is
 * built at runtime; the cast is the only place the typed resource keys are bypassed.
 */
function categoryLabel(t: TFunction, id: string): string {
  return t(`azkar.categories.${id}` as never);
}
