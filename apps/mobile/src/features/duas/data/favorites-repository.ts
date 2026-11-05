import { openUserDb } from '@/core/db/user/open';
import type { SqlExecutor } from '@/core/db/sql-executor';

export type DuaFavorite = {
  duaKey: string;
  createdAt: number;
};

export type DuaFavoritesStore = {
  db: SqlExecutor;
  now?: () => number;
};

function resolveStore(store?: DuaFavoritesStore): { db: SqlExecutor; now: () => number } {
  return {
    db: store?.db ?? openUserDb().executor,
    now: store?.now ?? Date.now,
  };
}

/** Adds the dua to favourites, or removes it. Returns whether it is a favourite afterwards (as `toggleFavorite` does for Azkar). */
export function toggleDuaFavorite(duaKey: string, store?: DuaFavoritesStore): boolean {
  const { db, now } = resolveStore(store);

  return db.transaction(() => {
    const existing = db.get<{ duaKey: string }>('SELECT dua_key AS duaKey FROM dua_favorites WHERE dua_key = ?', [duaKey]);

    if (existing !== undefined) {
      db.run('DELETE FROM dua_favorites WHERE dua_key = ?', [duaKey]);
      return false;
    }

    db.run('INSERT INTO dua_favorites (dua_key, created_at) VALUES (?, ?)', [duaKey, now()]);
    return true;
  });
}

export function addDuaFavorite(duaKey: string, store?: DuaFavoritesStore): void {
  const { db, now } = resolveStore(store);
  db.run(`INSERT OR IGNORE INTO dua_favorites (dua_key, created_at) VALUES (?, ?)`, [duaKey, now()]);
}

export function removeDuaFavorite(duaKey: string, store?: DuaFavoritesStore): void {
  const { db } = resolveStore(store);
  db.run('DELETE FROM dua_favorites WHERE dua_key = ?', [duaKey]);
}

export function isDuaFavorite(duaKey: string, store?: DuaFavoritesStore): boolean {
  const { db } = resolveStore(store);
  return db.get<{ duaKey: string }>('SELECT dua_key AS duaKey FROM dua_favorites WHERE dua_key = ?', [duaKey]) !== undefined;
}

/** Favourites, newest first. */
export function listDuaFavorites(store?: DuaFavoritesStore): DuaFavorite[] {
  const { db } = resolveStore(store);
  return db.all<DuaFavorite>(
    `SELECT dua_key AS duaKey, created_at AS createdAt FROM dua_favorites ORDER BY created_at DESC, dua_key ASC`,
  );
}
