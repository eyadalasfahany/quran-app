import type { Href } from 'expo-router';
import type { TFunction } from 'i18next';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { openContentDb } from '@/core/db/content/open';
import { openUserDb } from '@/core/db/user/open';
import { formatNumber } from '@/core/i18n/numbers';
import type { Locale } from '@/core/i18n/locale';
import { useCatalogVersion } from '@/core/sync/catalog-version';

import { azkarHref } from '../routes';
import { buildRecentAzkarEntries } from './recent-azkar';
import { categoryPeriodProgress } from './category-progress';
import { useRecentScopes } from './recent-scopes';

import {
  getCategory,
  getEntry,
  hasAzkarContent,
  listCategories,
  listCategoryIds,
  listCategoryUnits,
  type VariationOverrides,
} from './content-repository';
import { readAzkarFontScale, saveAzkarFontScale } from './font-scale';
import { liveFavoritesQuery, liveIsFavoriteQuery, liveProgressSummaryQuery, liveScopeProgressQuery } from './live-queries';
import { listFavoriteCards, type FavoriteCard } from './favorite-cards';
import type { AzkarCategory, AzkarCategoryListItem, AzkarEntryDetail } from './model';
import { completedUnitsIn, pickLastActiveScope, type ScopeResolution, type ScopeSummary } from './progress';
import type { ReaderUnit } from './reader-units';
import { resolveAzkarScope, type ResolvedAzkarScope } from './scope-resolver';
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

/**
 * Whether Azkar content is installed (ADR 0017: Home shows the tile only then). Home renders before the content
 * database is open, so an unopened database reads as unavailable rather than throwing.
 */
export function useAzkarAvailable(): boolean {
  const revision = useContentRevision();
  return useMemo(
    () =>
      readOr(false, () => {
        const { executor } = openContentDb();
        return hasAzkarContent(executor);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revision],
  );
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

/** Every (scope, period) progress summary. Session rows and the continue card read it; it is live. */
export function useAzkarProgressSummaries(): ScopeSummary[] {
  const { db } = openUserDb();
  const { data } = useLiveQuery(liveProgressSummaryQuery(db));
  return useMemo(
    () =>
      data.map((row) => ({
        scopeKey: row.scopeKey,
        periodKey: row.periodKey,
        completedUnits: Number(row.completedUnits),
        updatedAt: row.updatedAt ?? 0,
      })),
    [data],
  );
}

/** One category by id, or undefined. Re-reads when the catalogue changes. */
export function useAzkarCategory(categoryId: string): AzkarCategory | undefined {
  const revision = useContentRevision();
  const { executor } = openContentDb();
  return useMemo(
    () => readOr<AzkarCategory | undefined>(undefined, () => getCategory(executor, categoryId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [executor, categoryId, revision],
  );
}

/**
 * The scope to continue (the newest with an incomplete unit in its current period) and its completed count. Null when
 * nothing is in progress. Content and progress both drive it: it re-resolves on a catalogue change or a tap.
 */
export function useContinueAzkar(locale: Locale): { scope: ResolvedAzkarScope; completed: number } | null {
  const revision = useContentRevision();
  const { executor } = openContentDb();
  const summaries = useAzkarProgressSummaries();

  // `revision` is not read in the body, but a catalogue change must rebuild the resolver.
  const resolve = useMemo(
    () => resolveAzkarScope(executor, locale, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [executor, locale, revision],
  );
  const picked = useMemo(() => pickLastActiveScope(summaries, resolve), [resolve, summaries]);

  const scope = picked === null ? null : resolve(picked.scopeKey);
  if (scope === null) {
    return null;
  }
  return { scope, completed: completedUnitsIn(summaries, scope.scopeKey, scope.periodKey) };
}

/** Favourite cards in favourite order. Entries that no longer exist are skipped. */
export function useFavoriteCards(): FavoriteCard[] {
  const revision = useContentRevision();
  const { executor } = openContentDb();
  const { data: favorites } = useFavorites();
  return useMemo(
    () => readOr<FavoriteCard[]>([], () => listFavoriteCards(executor, favorites)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [executor, favorites, revision],
  );
}

/** A session category with its progress in the current period (Home's «أذكار مختارة» and the daily goals). */
export type SessionCategoryProgress = {
  id: string;
  title: string;
  completed: number;
  total: number;
  done: boolean;
};

/** The session categories, in content order, each with today's progress. Re-reads when progress or content moves. */
export function useSessionCategoryProgress(locale: Locale): SessionCategoryProgress[] {
  const { t } = useTranslation();
  const categories = useAzkarCategories(locale);
  const summaries = useAzkarProgressSummaries();

  return useMemo(
    () =>
      categories
        .filter((category) => category.kind === 'session')
        .map((category) => ({
          id: category.id,
          title: categoryLabel(t, category.id),
          ...categoryPeriodProgress(category, summaries, new Date()),
        })),
    // `t` changes with the language, so the labels follow it.
    [categories, summaries, t],
  );
}

/** A «آخر الأذكار» row: where it opens, its title and its progress line. */
export type RecentAzkarItem = {
  key: string;
  title: string;
  meta: string;
  done: boolean;
  href: Href;
};

/**
 * The recently opened Azkar, newest first, each opening the reader where the user left off (the reader resumes at the
 * first incomplete unit). Scopes that no longer resolve are left out. Content that is not open yet reads as empty.
 */
export function useRecentAzkarItems(locale: Locale): RecentAzkarItem[] {
  const { t } = useTranslation();
  const revision = useContentRevision();
  const scopes = useRecentScopes();
  const summaries = useAzkarProgressSummaries();

  return useMemo(
    () =>
      readOr<RecentAzkarItem[]>([], () => {
        const { executor } = openContentDb();
        const resolve = resolveAzkarScope(executor, locale, new Date());
        return buildRecentAzkarEntries(scopes, resolve, summaries).map((entry) => {
          const { scope } = entry;
          const title = scope.categoryId
            ? categoryLabel(t, scope.categoryId)
            : scope.occasion
              ? t(`azkar.occasions.${scope.occasion}` as never)
              : t('azkar.reader.entryTitle');
          const progress = t('azkar.reader.progress', {
            current: formatNumber(entry.completed, locale),
            total: formatNumber(entry.total, locale),
          });
          return {
            done: entry.done,
            href: scope.categoryId ? azkarHref.read(scope.categoryId) : azkarHref.entry(scope.entryKey ?? ''),
            key: scope.scopeKey,
            meta: entry.done ? `${progress} · ${t('home.recentAzkar.complete')}` : progress,
            title,
          };
        });
      }),
    // `t` changes with the language, so the labels follow it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, revision, scopes, summaries, t],
  );
}
