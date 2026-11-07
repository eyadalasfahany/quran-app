import { storage, storageKeys } from '@/core/storage/mmkv';

export const HADITH_RECENT_SEARCHES_MAX = 20;

/** Recent Hadith search queries, newest first. Local to the device and kept apart from the Quran and Azkar histories. */
export function readHadithRecentSearches(): string[] {
  const raw = storage.getString(storageKeys.hadith.searchRecent);
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
  storage.set(storageKeys.hadith.searchRecent, JSON.stringify(queries));
  return queries;
}

export function addHadithRecentSearch(query: string): string[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return readHadithRecentSearches();
  }
  return write(
    [trimmed, ...readHadithRecentSearches().filter((entry) => entry !== trimmed)].slice(0, HADITH_RECENT_SEARCHES_MAX),
  );
}

export function removeHadithRecentSearch(query: string): string[] {
  return write(readHadithRecentSearches().filter((entry) => entry !== query));
}

export function clearHadithRecentSearches(): string[] {
  storage.remove(storageKeys.hadith.searchRecent);
  return [];
}
