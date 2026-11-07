import { useMemo } from 'react';

import { countHadithSearch, queryTokens, searchHadith, type HadithSearchResultHit } from '../data';
import { useHadithContent } from './useHadithContent';

export type HadithSearchResult = {
  hits: HadithSearchResultHit[];
  hasMore: boolean;
  /** Every match for the query and scope, across all pages. */
  total: number;
  /** False for an empty, spaces-only or punctuation-only query: the screen shows its idle state. */
  hasTokens: boolean;
};

const EMPTY_PAGE: Omit<HadithSearchResult, 'hasTokens' | 'total'> = { hits: [], hasMore: false };

/**
 * Searches the installed hadith collections for the query. `scope` is one slug or null (all installed). `limit` is the
 * number of hits to load (a page grows it by HADITH_SEARCH_PAGE_SIZE). The total is counted once per query and scope,
 * not per page.
 */
export function useHadithSearch({
  query,
  scope,
  limit,
}: {
  query: string;
  scope: string | null;
  limit: number;
}): HadithSearchResult {
  const hasTokens = useMemo(() => queryTokens(query).length > 0, [query]);
  const slugs = scope === null ? undefined : [scope];

  const total = useHadithContent(0, (db) => (hasTokens ? countHadithSearch(db, query, { slugs }) : 0), [
    query,
    scope,
    hasTokens,
  ]);
  const page = useHadithContent(
    EMPTY_PAGE,
    (db) => (hasTokens ? searchHadith(db, query, { slugs, limit }) : EMPTY_PAGE),
    [query, scope, limit, hasTokens],
  );

  return useMemo(() => ({ hits: page.hits, hasMore: page.hasMore, total, hasTokens }), [page, total, hasTokens]);
}
