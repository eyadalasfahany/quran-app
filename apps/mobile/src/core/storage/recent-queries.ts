import { storage } from './mmkv';

/** A capped history of search queries, newest first, kept as a JSON array under one MMKV key. */
export type RecentQueries = {
  read: () => string[];
  /** Adds a query to the front (trimmed; blanks are ignored; repeats move to the front). Returns the new list. */
  add: (query: string) => string[];
  remove: (query: string) => string[];
  clear: () => string[];
};

/** Each search screen gets its own key, so one history never shows in another. */
export function createRecentQueries(key: string, max: number): RecentQueries {
  const read = (): string[] => {
    const raw = storage.getString(key);
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
  };

  const write = (queries: string[]): string[] => {
    storage.set(key, JSON.stringify(queries));
    return queries;
  };

  return {
    read,
    add: (query) => {
      const trimmed = query.trim();
      if (trimmed.length === 0) {
        return read();
      }
      return write([trimmed, ...read().filter((entry) => entry !== trimmed)].slice(0, max));
    },
    remove: (query) => write(read().filter((entry) => entry !== query)),
    clear: () => {
      storage.remove(key);
      return [];
    },
  };
}
