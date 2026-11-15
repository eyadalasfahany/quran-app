import { createRecentQueries } from '@/core/storage/recent-queries';
import { storageKeys } from '@/core/storage/mmkv';

export const DUAS_RECENT_SEARCHES_MAX = 10;

/** Recent Duas search queries, newest first. Kept apart from the Azkar and Quran histories. */
const history = createRecentQueries(storageKeys.duas.searchRecent, DUAS_RECENT_SEARCHES_MAX);

export function readDuasRecentSearches(): string[] {
  return history.read();
}

export function addDuasRecentSearch(query: string): string[] {
  return history.add(query);
}

export function removeDuasRecentSearch(query: string): string[] {
  return history.remove(query);
}

export function clearDuasRecentSearches(): string[] {
  return history.clear();
}
