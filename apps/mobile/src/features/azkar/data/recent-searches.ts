import { createRecentQueries } from '@/core/storage/recent-queries';
import { storageKeys } from '@/core/storage/mmkv';

export const AZKAR_RECENT_SEARCHES_MAX = 10;

/** Recent Azkar search queries, newest first. Kept apart from the Quran search history. */
const history = createRecentQueries(storageKeys.azkar.searchRecent, AZKAR_RECENT_SEARCHES_MAX);

export function readAzkarRecentSearches(): string[] {
  return history.read();
}

export function addAzkarRecentSearch(query: string): string[] {
  return history.add(query);
}

export function removeAzkarRecentSearch(query: string): string[] {
  return history.remove(query);
}

export function clearAzkarRecentSearches(): string[] {
  return history.clear();
}
