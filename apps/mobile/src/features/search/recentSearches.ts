import { storage, storageKeys } from '@/core/storage/mmkv';

export const RECENT_SEARCHES_MAX = 20;

export function readRecentSearches(): string[] {
  const raw = storage.getString(storageKeys.searchRecentQueries);
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

export function addRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return readRecentSearches();
  }

  const next = [trimmed, ...readRecentSearches().filter((entry) => entry !== trimmed)].slice(
    0,
    RECENT_SEARCHES_MAX,
  );
  storage.set(storageKeys.searchRecentQueries, JSON.stringify(next));
  return next;
}

export function removeRecentSearch(query: string): string[] {
  const next = readRecentSearches().filter((entry) => entry !== query);
  storage.set(storageKeys.searchRecentQueries, JSON.stringify(next));
  return next;
}

export function clearRecentSearches(): string[] {
  storage.remove(storageKeys.searchRecentQueries);
  return [];
}
