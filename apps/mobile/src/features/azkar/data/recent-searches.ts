import { storage, storageKeys } from '@/core/storage/mmkv';

export const AZKAR_RECENT_SEARCHES_MAX = 10;

/** Recent Azkar search queries, newest first. Kept apart from the Quran search history. */
export function readAzkarRecentSearches(): string[] {
  const raw = storage.getString(storageKeys.azkar.searchRecent);
  if (raw === undefined || raw.length === 0) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
  } catch {
    return [];
  }
}

function write(queries: string[]): string[] {
  storage.set(storageKeys.azkar.searchRecent, JSON.stringify(queries));
  return queries;
}

export function addAzkarRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return readAzkarRecentSearches();
  }
  return write([trimmed, ...readAzkarRecentSearches().filter((entry) => entry !== trimmed)].slice(0, AZKAR_RECENT_SEARCHES_MAX));
}

export function removeAzkarRecentSearch(query: string): string[] {
  return write(readAzkarRecentSearches().filter((entry) => entry !== query));
}

export function clearAzkarRecentSearches(): string[] {
  storage.remove(storageKeys.azkar.searchRecent);
  return [];
}
