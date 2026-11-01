import { openUserDb } from '@/core/db/user/open';
import type { SqlExecutor } from '@/core/db/sql-executor';

import type { AzkarFavorite } from './model';
import type { AzkarStore } from './progress-repository';

function resolveStore(store?: AzkarStore): { db: SqlExecutor; now: () => number } {
  return {
    db: store?.db ?? openUserDb().executor,
    now: store?.now ?? Date.now,
  };
}

/** Adds the entry to favourites, or removes it. Returns whether it is a favourite afterwards. */
export function toggleFavorite(entryKey: string, store?: AzkarStore): boolean {
  const { db, now } = resolveStore(store);

  return db.transaction(() => {
    const existing = db.get<{ entryKey: string }>('SELECT entry_key AS entryKey FROM azkar_favorites WHERE entry_key = ?', [
      entryKey,
    ]);

    if (existing !== undefined) {
      db.run('DELETE FROM azkar_favorites WHERE entry_key = ?', [entryKey]);
      return false;
    }

    db.run('INSERT INTO azkar_favorites (entry_key, created_at) VALUES (?, ?)', [entryKey, now()]);
    return true;
  });
}

export function isFavorite(entryKey: string, store?: AzkarStore): boolean {
  const { db } = resolveStore(store);
  return db.get<{ entryKey: string }>('SELECT entry_key AS entryKey FROM azkar_favorites WHERE entry_key = ?', [entryKey]) !== undefined;
}

/** Favourites, newest first. */
export function listFavorites(store?: AzkarStore): AzkarFavorite[] {
  const { db } = resolveStore(store);
  return db.all<AzkarFavorite>(
    `SELECT entry_key AS entryKey, created_at AS createdAt
     FROM azkar_favorites
     ORDER BY created_at DESC, entry_key ASC`,
  );
}
